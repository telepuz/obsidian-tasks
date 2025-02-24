<!-- placeholder to force blank line before included text -->

| Field | Type | Example |
| ----- | ----- | ----- |
| `query.file.path` | `string` | `'root/sub-folder/file containing query.md'` |
| `query.file.pathWithoutExtension` | `string` | `'root/sub-folder/file containing query'` |
| `query.file.root` | `string` | `'root/'` |
| `query.file.folder` | `string` | `'root/sub-folder/'` |
| `query.file.filename` | `string` | `'file containing query.md'` |
| `query.file.filenameWithoutExtension` | `string` | `'file containing query'` |
| `query.file.hasProperty('task_instruction')` | `boolean` | `true` |
| `query.file.hasProperty('non_existent_property')` | `boolean` | `false` |
| `query.file.property('task_instruction')` | `string` | `'group by filename'` |
| `query.file.property('non_existent_property')` | `null` | `null` |


<!-- placeholder to force blank line after included text -->
