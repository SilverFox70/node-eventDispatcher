# NodeDispatcher editor

Install this optional package beside `event-driven-design`, React and React DOM. Use the public client entry from a React application and include its stylesheet.

```tsx
import { GraphEditor } from 'event-driven-design-editor';
import 'event-driven-design-editor/styles.css';

// Pass serializable catalog metadata from your application.
<GraphEditor catalog={catalog} />;
```

The palette adds registered nodes to an in-memory canvas. Select nodes on the canvas or in the keyboard-accessible list to inspect their port contracts. This slice covers placement and inspection. Wiring, settings editing and test execution follow in subsequent slices.


From the NodeDispatcher checkout, run `npm run build` and `npm run build:editor`, then pack the core with `npm pack` and the editor with `npm pack --workspace event-driven-design-editor`. Install both tarballs in the host Next application. For an npm workspace, add the core and editor as local packages, declare their matching versions in the application, and build core, editor, then the app. The Next consumer and local workspace fixtures exercise both paths.
