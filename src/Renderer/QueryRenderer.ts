import {
    type CachedMetadata,
    type EventRef,
    type MarkdownPostProcessorContext,
    MarkdownRenderChild,
    MarkdownRenderer,
    type TAbstractFile,
    TFile,
} from 'obsidian';
import { App, Keymap } from 'obsidian';
import { GlobalQuery } from '../Config/GlobalQuery';
import { getQueryForQueryRenderer } from '../Query/QueryRendererHelper';
import type TasksPlugin from '../main';
import type { State } from '../Obsidian/Cache';
import { getTaskLineAndFile, replaceTaskWithTasks } from '../Obsidian/File';
import { TaskModal } from '../Obsidian/TaskModal';
import type { TasksEvents } from '../Obsidian/TasksEvents';
import { TasksFile } from '../Scripting/TasksFile';
import { DateFallback } from '../DateTime/DateFallback';
import type { Task } from '../Task/Task';
import { type BacklinksEventHandler, type EditButtonClickHandler, QueryResultsRenderer } from './QueryResultsRenderer';
import { createAndAppendElement } from './TaskLineRenderer';

/**
 * `QueryRenderer` is responsible for rendering queries in Markdown code blocks
 * annotated with the 'tasks' processor.
 *
 * It manages the initialization of query rendering related tasks, processing metadata,
 * and adding rendered content to the DOM.
 */
export class QueryRenderer {
    private readonly app: App;
    private readonly plugin: TasksPlugin;
    private readonly events: TasksEvents;

    constructor({ plugin, events }: { plugin: TasksPlugin; events: TasksEvents }) {
        this.app = plugin.app;
        this.plugin = plugin;
        this.events = events;

        plugin.registerMarkdownCodeBlockProcessor('tasks', (source, el, ctx) => {
            plugin.app.workspace.onLayoutReady(() => {
                this.addQueryRenderChild(source, el, ctx);
            });
        });
    }

    public addQueryRenderChild = this._addQueryRenderChild.bind(this);

    private async _addQueryRenderChild(source: string, element: HTMLElement, context: MarkdownPostProcessorContext) {
        // Issues with this first implementation of accessing properties in query files:
        //  - If the file was created in the last second or two, any CachedMetadata is probably
        //    not yet available, so empty.
        //  - Multi-line properties are supported, but they cannot contain
        //    continuation lines.
        const app = this.app;
        const filePath = context.sourcePath;
        const tFile = app.vault.getAbstractFileByPath(filePath);
        let fileCache: CachedMetadata | null = null;
        if (tFile && tFile instanceof TFile) {
            fileCache = app.metadataCache.getFileCache(tFile);
        }
        const tasksFile = new TasksFile(filePath, fileCache ?? {});

        const queryRenderChild = new QueryRenderChild({
            app: app,
            plugin: this.plugin,
            events: this.events,
            container: element,
            source,
            tasksFile,
        });
        context.addChild(queryRenderChild);
        queryRenderChild.load();
    }
}

/**
 * A class that extends {@link MarkdownRenderChild} to render query results dynamically in Obsidian.
 *
 * This class listens to various Obsidian events such as metadata updates, cache changes, and
 * file renames, and re-renders query results when relevant data changes. It supports dynamic
 * updates, including reloading query results at midnight to ensure accurate relative date queries.
 *
 * The generation of HTML to render task lines is done by {@link QueryResultsRenderer}.
 */
class QueryRenderChild extends MarkdownRenderChild {
    private readonly app: App;
    private readonly plugin: TasksPlugin;
    private readonly events: TasksEvents;

    private renderEventRef: EventRef | undefined;
    private queryReloadTimeout: NodeJS.Timeout | undefined;

    private readonly queryResultsRenderer: QueryResultsRenderer;

    constructor({
        app,
        plugin,
        events,
        container,
        source,
        tasksFile,
    }: {
        app: App;
        plugin: TasksPlugin;
        events: TasksEvents;
        container: HTMLElement;
        source: string;
        tasksFile: TasksFile;
    }) {
        super(container);

        this.queryResultsRenderer = new QueryResultsRenderer(
            this.containerEl.className,
            source,
            tasksFile,
            MarkdownRenderer.renderMarkdown,
            this,
        );

        this.queryResultsRenderer.query.debug('[render] QueryRenderChild.constructor() entered');

        this.app = app;
        this.plugin = plugin;
        this.events = events;
    }

    onload() {
        this.queryResultsRenderer.query.debug('[render] QueryRenderChild.onload() entered');

        // Process the current cache state:
        this.events.triggerRequestCacheUpdate(this.render.bind(this));
        // Listen to future cache changes:
        this.renderEventRef = this.events.onCacheUpdate(this.render.bind(this));

        this.reloadQueryAtMidnight();

        this.registerEvent(
            this.app.metadataCache.on('changed', (sourceFile, _data, fileCache) => {
                const filePath = sourceFile.path;
                if (filePath !== this.queryResultsRenderer.filePath) {
                    // We get notified of edits to all files, and are only interested in the
                    // file where our query is.
                    return;
                }

                this.handleMetadataOrFilePathChange(filePath, fileCache);
            }),
        );

        this.registerEvent(
            this.app.vault.on('rename', (tFile: TAbstractFile, _oldPath: string) => {
                let fileCache: CachedMetadata | null = null;
                if (tFile && tFile instanceof TFile) {
                    fileCache = this.app.metadataCache.getFileCache(tFile);
                }
                this.handleMetadataOrFilePathChange(tFile.path, fileCache);
            }),
        );
    }

    private handleMetadataOrFilePathChange(filePath: string, fileCache: CachedMetadata | null) {
        const oldTasksFile = this.queryResultsRenderer.tasksFile;
        const newTasksFile = new TasksFile(filePath, fileCache ?? {});

        // Has anything changed which might change the query results?
        const differentPath = oldTasksFile.path !== newTasksFile.path;
        const differentFrontmatter = !oldTasksFile.rawFrontmatterIdenticalTo(newTasksFile);
        const queryNeedsReloading = differentPath || differentFrontmatter;

        if (queryNeedsReloading) {
            this.queryResultsRenderer.setTasksFile(newTasksFile);
            this.events.triggerRequestCacheUpdate(this.render.bind(this));
        }
    }

    onunload() {
        this.queryResultsRenderer.query.debug('[render] QueryRenderChild.onunload() entered');

        if (this.renderEventRef !== undefined) {
            this.events.off(this.renderEventRef);
        }

        if (this.queryReloadTimeout !== undefined) {
            clearTimeout(this.queryReloadTimeout);
        }
    }

    /**
     * Reloads the query after midnight to update results from relative date queries.
     *
     * For example, the query `due today` changes every day. This makes sure that all query results
     * are re-rendered after midnight every day to ensure up-to-date results without having to
     * reload obsidian. Creating a new query object from the source re-applies the relative dates
     * to "now".
     */
    private reloadQueryAtMidnight(): void {
        const midnight = new Date();
        midnight.setHours(24, 0, 0, 0);
        const now = new Date();

        const millisecondsToMidnight = midnight.getTime() - now.getTime();

        this.queryReloadTimeout = setTimeout(() => {
            this.queryResultsRenderer.query = getQueryForQueryRenderer(
                this.queryResultsRenderer.source,
                GlobalQuery.getInstance(),
                this.queryResultsRenderer.tasksFile,
            );
            // Process the current cache state:
            this.events.triggerRequestCacheUpdate(this.render.bind(this));
            this.reloadQueryAtMidnight();
        }, millisecondsToMidnight + 1000); // Add buffer to be sure to run after midnight.
    }

    private async render({ tasks, state }: { tasks: Task[]; state: State }) {
        const content = createAndAppendElement('div', this.containerEl);
        await this.queryResultsRenderer.render(state, tasks, content, {
            allTasks: this.plugin.getTasks(),
            allMarkdownFiles: this.app.vault.getMarkdownFiles(),
            backlinksClickHandler: createBacklinksClickHandler(this.app),
            backlinksMousedownHandler: createBacklinksMousedownHandler(this.app),
            editTaskPencilClickHandler: createEditTaskPencilClickHandler(this.app),
        });

        this.containerEl.firstChild?.replaceWith(content);
    }
}

function createEditTaskPencilClickHandler(app: App): EditButtonClickHandler {
    return function editTaskPencilClickHandler(event: MouseEvent, task: Task, allTasks: Task[]) {
        event.preventDefault();

        const onSubmit = async (updatedTasks: Task[]): Promise<void> => {
            await replaceTaskWithTasks({
                originalTask: task,
                newTasks: DateFallback.removeInferredStatusIfNeeded(task, updatedTasks),
            });
        };

        // Need to create a new instance every time, as cursor/task can change.
        const taskModal = new TaskModal({
            app,
            task,
            onSubmit,
            allTasks,
        });
        taskModal.open();
    };
}

function createBacklinksClickHandler(app: App): BacklinksEventHandler {
    return async function backlinksClickHandler(ev: MouseEvent, task: Task) {
        const result = await getTaskLineAndFile(task, app.vault);
        if (result) {
            const [line, file] = result;
            const leaf = app.workspace.getLeaf(Keymap.isModEvent(ev));
            // When the corresponding task has been found,
            // suppress the default behavior of the mouse click event
            // (which would interfere e.g. if the query is rendered inside a callout).
            ev.preventDefault();
            // Instead of the default behavior, open the file with the required line highlighted.
            await leaf.openFile(file, { eState: { line } });
        }
    };
}

function createBacklinksMousedownHandler(app: App): BacklinksEventHandler {
    return async function backlinksMousedownHandler(ev: MouseEvent, task: Task) {
        // Open in a new tab on middle-click.
        // This distinction is not available in the 'click' event, so we handle the 'mousedown' event
        // solely for this.
        // (for regular left-click we prefer the 'click' event, and not to just do everything here, because
        // the 'click' event is more generic for touch devices etc.)
        if (ev.button === 1) {
            const result = await getTaskLineAndFile(task, app.vault);
            if (result) {
                const [line, file] = result;
                const leaf = app.workspace.getLeaf('tab');
                ev.preventDefault();
                await leaf.openFile(file, { eState: { line: line } });
            }
        }
    };
}
