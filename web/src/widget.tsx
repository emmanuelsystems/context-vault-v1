import { useState } from 'react'
import './widget.css'

export default function Widget() {
    const [count, setCount] = useState(0)

    return (
        <div className="context-vault-widget">
            <h1>Context Vault Widget</h1>
            <div className="card">
                <button onClick={() => setCount((count) => count + 1)}>
                    count is {count}
                </button>
                <p>
                    Edit <code>src/widget.tsx</code> to customize this widget
                </p>
            </div>
        </div>
    )
}
