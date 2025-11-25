// web/src/main.tsx (Conceptual Entry File)

import React from 'react';
import ReactDOM from 'react-dom/client';
import WorkbenchWidget from './WorkbenchWidget'; // Import the new component

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <WorkbenchWidget />
    </React.StrictMode>,
);