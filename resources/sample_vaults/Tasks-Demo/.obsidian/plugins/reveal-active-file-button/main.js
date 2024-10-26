/*
THIS IS A GENERATED/BUNDLED FILE BY ROLLUP
if you want to view the source visit the plugins github repository
*/

'use strict';

var obsidian = require('obsidian');

/*! *****************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */

function __awaiter(thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
}

// From https://icon-sets.iconify.design/feather/crosshair/ - "feather-crosshair"
const REVEAL_ACTIVE_FILE_BUTTON_ICON = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" width="18" height="18" preserveAspectRatio="xMidYMid meet" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M22 12h-4"/><path d="M6 12H2"/><path d="M12 6V2"/><path d="M12 22v-4"/></g></svg>';

class RevealActiveFileButtonPlugin extends obsidian.Plugin {
    onload() {
        return __awaiter(this, void 0, void 0, function* () {
            // Initialize
            this.app.workspace.onLayoutReady(() => {
                const explorers = this.getFileExplorers();
                explorers.forEach((exp) => {
                    this.addRevealButton(exp);
                });
            });
            // File explorers that get opened later on
            this.registerEvent(this.app.workspace.on('layout-change', () => {
                const explorers = this.getFileExplorers();
                explorers.forEach((exp) => {
                    this.addRevealButton(exp);
                });
            }));
        });
    }
    onunload() {
        // Remove all reveal buttons
        const explorers = this.getFileExplorers();
        explorers.forEach((exp) => {
            this.removeRevealButton(exp);
        });
    }
    /**
     * Adds the reveal button to a file explorer leaf.
     * Returns the newly created button element or the old one if already there.
     */
    addRevealButton(explorer) {
        const container = explorer.view.containerEl;
        const navContainer = container.querySelector('div.nav-buttons-container');
        if (!navContainer) {
            return null;
        }
        const existingButton = this.getRevealButton(explorer);
        if (existingButton) {
            return;
        }
        const newIcon = document.createElement('div');
        this.setButtonProperties(newIcon);
        newIcon.className = 'clickable-icon nav-action-button reveal-active-file-button';
        this.registerDomEvent(newIcon, 'click', () => {
            this.onButtonClick(explorer);
        });
        navContainer.appendChild(newIcon);
    }
    /**
     * Remove the reveal button from a given file explorer leaf.
     */
    removeRevealButton(explorer) {
        const button = this.getRevealButton(explorer);
        if (button) {
            button.remove();
        }
    }
    /**
     * Reveal the active file in the given file explorer
     */
    onButtonClick(explorer) {
        if (explorer) {
            // @ts-ignore
            this.app.commands.executeCommandById('file-explorer:reveal-active-file');
            // Send the command twice like a double-click, to handle the frequent case where Obsidian fails to jump to the file
            setTimeout(() => {
                // @ts-ignore
                this.app.commands.executeCommandById('file-explorer:reveal-active-file');
            }, 50);
        }
    }
    setButtonProperties(button) {
        button.innerHTML = REVEAL_ACTIVE_FILE_BUTTON_ICON;
        button.setAttribute('aria-label', 'Reveal active file');
    }
    /**
     * Returns all loaded file explorer leaves
     */
    getFileExplorers() {
        return this.app.workspace.getLeavesOfType('file-explorer');
    }
    /**
     * Get the reveal button for a given file explorer, if it exists
     */
    getRevealButton(explorer) {
        return explorer.view.containerEl.querySelector('.reveal-active-file-button');
    }
}

module.exports = RevealActiveFileButtonPlugin;


/* nosourcemap */