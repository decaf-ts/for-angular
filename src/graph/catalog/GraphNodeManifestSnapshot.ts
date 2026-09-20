/**
 * @module for-angular/graph/catalog/GraphNodeManifestSnapshot
 * @summary Serialized built-in node manifests for the canonical Angular catalogue (DECAF-50 §4.26 R2-1).
 * @description Metadata-only snapshot of the backend-published built-in node manifests
 * (R2-1: node classes are backend-only; the frontend receives only serializable
 * manifests). This snapshot is the offline/demo fallback for the live
 * `GET /graph/node-types` catalogue — it carries no classes, constructors,
 * functions, or execute code, only the published `GraphNodeManifest` JSON shape.
 * Display values mirror the canonical `@node`-decorated classes (category,
 * colour, icon, size, ports): the live catalogue currently resolves each node's
 * effective icon from its category registry entry instead of the node's own
 * explicit `@node` icon, so `core.flow.code`/`core.flow.log` and the
 * triggers publish their category icon. The fixture keeps the canonical per-node
 * icons the node face renders (D7/G3-24..25); the shared precedence bug is
 * reported separately.
 */
import type { GraphNodeManifest, GraphPortManifest } from '@decaf-ts/ui-decorators/graph';

/** Serialized built-in node manifests, kind-sorted; mirrors the canonical `@node` display values. */
export const GRAPH_BUILT_IN_NODE_MANIFEST_SNAPSHOT: GraphNodeManifest[] = [
  {
    "kind": "core.agent",
    "display": {
      "name": "Agent",
      "description": "AI agent that orchestrates a model, memory, and workspace to complete a task.",
      "category": "Agent",
      "labels": [
        "agent",
        "ai",
        "orchestrator"
      ],
      "icon": {
        "type": "catalogue",
        "name": "ti-robot"
      },
      "width": 140,
      "height": 120
    },
    "inputs": [
      {
        "id": "prompt",
        "label": "Prompt",
        "direction": "input",
        "schema": {
          "type": "model",
          "name": "String"
        },
        "required": true,
        "handle": "prompt"
      }
    ],
    "outputs": [
      {
        "id": "response",
        "label": "Response",
        "direction": "output",
        "schema": {
          "type": "model",
          "name": "String"
        },
        "required": true,
        "handle": "response"
      },
      {
        "id": "actions",
        "label": "Actions",
        "direction": "output",
        "schema": {
          "type": "model",
          "name": "Array"
        },
        "required": true,
        "handle": "actions"
      }
    ],
    "parameters": [
      {
        "type": "object",
        "id": "prompt",
        "label": "Prompt",
        "required": true,
        "placeholder": "Enter task prompt. Supports placeholders like {{ $input.brief }} or {{ $node[\"Research\"].output.summary }}"
      }
    ],
    "connections": [
      {
        "id": "model",
        "label": "model",
        "direction": "connection",
        "schema": {
          "type": "object",
          "properties": {}
        },
        "category": "model",
        "handle": "model"
      },
      {
        "id": "memory",
        "label": "memory",
        "direction": "connection",
        "schema": {
          "type": "object",
          "properties": {}
        },
        "category": "memory",
        "handle": "memory"
      },
      {
        "id": "workspace",
        "label": "workspace",
        "direction": "connection",
        "schema": {
          "type": "object",
          "properties": {}
        },
        "category": "workspace",
        "handle": "workspace"
      }
    ]
  },
  {
    "kind": "core.flow.break",
    "display": {
      "name": "Break",
      "description": "Breaks out of the enclosing loop. The loop terminates early and returns the results collected so far.",
      "category": "Flow Control",
      "labels": [
        "flow",
        "break",
        "loop",
        "control"
      ],
      "icon": {
        "type": "catalogue",
        "name": "ti-arrows-split-2"
      },
      "color": "#f59e0b",
      "width": 96,
      "height": 96
    },
    "inputs": [
      {
        "id": "value",
        "label": "Value",
        "direction": "input",
        "schema": {
          "type": "object",
          "properties": {}
        },
        "required": true,
        "handle": "value"
      }
    ],
    "outputs": [
      {
        "id": "broken",
        "label": "broken",
        "direction": "output",
        "schema": {
          "type": "object",
          "properties": {}
        },
        "required": true,
        "handle": "broken"
      }
    ],
    "parameters": [
      {
        "type": "object",
        "id": "value",
        "label": "Value",
        "required": true,
        "placeholder": "Value to forward (collected as the last partial result)"
      }
    ]
  },
  {
    "kind": "core.flow.code",
    "display": {
      "name": "Code",
      "description": "Runs user-authored JS/TS in a restricted VM sandbox. Supports placeholder syntax for workflow data references.",
      "category": "Utility",
      "labels": [
        "flow",
        "code",
        "sandbox",
        "transform"
      ],
      "icon": {
        "type": "catalogue",
        "name": "ti-code"
      },
      "color": "#0d9488",
      "width": 96,
      "height": 96
    },
    "inputs": [
      {
        "id": "code",
        "label": "Code",
        "direction": "input",
        "schema": {
          "type": "model",
          "name": "String"
        },
        "required": true,
        "handle": "code",
        // R2-3(4): the code input carries its `@uielement("code-editor", ...)`
        // decoration so the canvas adapter forwards it to the port field and the
        // IDE-like editor renders instead of a plain input. Serialized shape
        // mirrors `uielement()`: `{ tag, serialize, props: { ...props, name } }`.
        "element": {
          "tag": "code-editor",
          "serialize": false,
          "props": {
            "label": "Code",
            "placeholder": "// User-authored JS code",
            "name": "code"
          }
        }
      } as GraphPortManifest & { element: Record<string, unknown> },
      {
        "id": "data",
        "label": "data",
        "direction": "input",
        "schema": {
          "type": "object",
          "properties": {}
        },
        "hidden": true,
        "handle": "data"
      }
    ],
    "outputs": [
      {
        "id": "result",
        "label": "result",
        "direction": "output",
        "schema": {
          "type": "object",
          "properties": {}
        },
        "required": true,
        "handle": "result"
      }
    ],
    "parameters": [
      {
        "type": "code",
        "id": "code",
        "label": "Code",
        "required": true,
        "placeholder": "// User-authored JS code",
        "language": "javascript"
      },
      {
        "type": "hidden",
        "id": "data",
        "label": "data",
        "required": false
      }
    ]
  },
  {
    "kind": "core.flow.delay",
    "display": {
      "name": "Delay",
      "description": "Pauses execution for the configured duration (in milliseconds), then forwards the input unchanged.",
      "category": "Utility",
      "labels": [
        "flow",
        "delay",
        "wait"
      ],
      "icon": {
        "type": "catalogue",
        "name": "ti-tool"
      },
      "color": "#0d9488",
      "width": 96,
      "height": 96
    },
    "inputs": [
      {
        "id": "value",
        "label": "Input value",
        "direction": "input",
        "schema": {
          "type": "object",
          "properties": {}
        },
        "required": true,
        "handle": "value"
      }
    ],
    "outputs": [
      {
        "id": "valueOut",
        "label": "Output value",
        "direction": "output",
        "schema": {
          "type": "object",
          "properties": {}
        },
        "required": true,
        "handle": "value"
      }
    ],
    "parameters": [
      {
        "type": "object",
        "id": "value",
        "label": "Input value",
        "required": true,
        "placeholder": "Value to forward after delay"
      }
    ]
  },
  {
    "kind": "core.flow.errorBoundary",
    "display": {
      "name": "Error boundary",
      "description": "Wraps the input in a try/catch/finally. Emits the result on success, or the error on failure.",
      "category": "Flow Control",
      "labels": [
        "flow",
        "error",
        "try-catch"
      ],
      "icon": {
        "type": "catalogue",
        "name": "ti-arrows-split-2"
      },
      "color": "#f59e0b",
      "width": 96,
      "height": 96
    },
    "inputs": [
      {
        "id": "value",
        "label": "Input value",
        "direction": "input",
        "schema": {
          "type": "object",
          "properties": {}
        },
        "required": true,
        "handle": "value"
      }
    ],
    "outputs": [
      {
        "id": "result",
        "label": "Result",
        "direction": "output",
        "schema": {
          "type": "object",
          "properties": {}
        },
        "required": true,
        "handle": "result"
      },
      {
        "id": "error",
        "label": "Error",
        "direction": "output",
        "schema": {
          "type": "object",
          "properties": {}
        },
        "required": true,
        "handle": "error"
      }
    ],
    "parameters": [
      {
        "type": "object",
        "id": "value",
        "label": "Input value",
        "required": true,
        "placeholder": "Value to guard"
      }
    ]
  },
  {
    "kind": "core.flow.humanApproval",
    "display": {
      "name": "Human approval",
      "description": "Suspends execution until a human approves or rejects. Emits the approved value or a rejection.",
      "category": "Flow Control",
      "labels": [
        "flow",
        "approval",
        "suspend"
      ],
      "icon": {
        "type": "catalogue",
        "name": "ti-arrows-split-2"
      },
      "color": "#f59e0b",
      "width": 96,
      "height": 96
    },
    "inputs": [
      {
        "id": "value",
        "label": "Input value",
        "direction": "input",
        "schema": {
          "type": "object",
          "properties": {}
        },
        "required": true,
        "handle": "value"
      }
    ],
    "outputs": [
      {
        "id": "approved",
        "label": "Approved",
        "direction": "output",
        "schema": {
          "type": "object",
          "properties": {}
        },
        "required": true,
        "handle": "approved"
      },
      {
        "id": "rejected",
        "label": "Rejected",
        "direction": "output",
        "schema": {
          "type": "object",
          "properties": {}
        },
        "required": true,
        "handle": "rejected"
      }
    ],
    "parameters": [
      {
        "type": "object",
        "id": "value",
        "label": "Input value",
        "required": true,
        "placeholder": "Value pending approval"
      }
    ]
  },
  {
    "kind": "core.flow.if",
    "display": {
      "name": "If",
      "description": "Conditional branch. Evaluates the configured condition and routes the input to the matching output.",
      "category": "Flow Control",
      "labels": [
        "flow",
        "conditional",
        "branch"
      ],
      "icon": {
        "type": "catalogue",
        "name": "ti-arrows-split-2"
      },
      "color": "#f59e0b",
      "width": 96,
      "height": 96
    },
    "inputs": [
      {
        "id": "value",
        "label": "Input value",
        "direction": "input",
        "schema": {
          "type": "object",
          "properties": {}
        },
        "required": true,
        "handle": "value"
      }
    ],
    "outputs": [
      {
        "id": "then",
        "label": "Then",
        "direction": "output",
        "schema": {
          "type": "object",
          "properties": {}
        },
        "required": true,
        "handle": "then"
      },
      {
        "id": "else",
        "label": "Else",
        "direction": "output",
        "schema": {
          "type": "object",
          "properties": {}
        },
        "required": true,
        "handle": "else"
      }
    ],
    "parameters": [
      {
        "type": "object",
        "id": "value",
        "label": "Input value",
        "required": true,
        "placeholder": "Value to evaluate"
      }
    ]
  },
  {
    "kind": "core.flow.log",
    "display": {
      "name": "Log",
      "description": "Logs the input value to the execution logger and forwards it unchanged.",
      "category": "Utility",
      "labels": [
        "flow",
        "log",
        "debug",
        "utility"
      ],
      "icon": {
        "type": "catalogue",
        "name": "ti-terminal"
      },
      "color": "#0d9488",
      "width": 96,
      "height": 96
    },
    "inputs": [
      {
        "id": "value",
        "label": "Input value",
        "direction": "input",
        "schema": {
          "type": "object",
          "properties": {}
        },
        "required": true,
        "handle": "value"
      }
    ],
    "outputs": [
      {
        "id": "logged",
        "label": "Logged value",
        "direction": "output",
        "schema": {
          "type": "object",
          "properties": {}
        },
        "required": true,
        "handle": "logged"
      }
    ],
    "parameters": [
      {
        "type": "object",
        "id": "value",
        "label": "Input value",
        "required": true,
        "placeholder": "Value to log"
      }
    ]
  },
  {
    "kind": "core.flow.map",
    "display": {
      "name": "Map",
      "description": "Transforms the current input into a new output object using the configured mapper.",
      "category": "Utility",
      "labels": [
        "flow",
        "map",
        "transform"
      ],
      "icon": {
        "type": "catalogue",
        "name": "ti-tool"
      },
      "color": "#0d9488",
      "width": 96,
      "height": 96
    },
    "inputs": [
      {
        "id": "value",
        "label": "Input value",
        "direction": "input",
        "schema": {
          "type": "object",
          "properties": {}
        },
        "required": true,
        "handle": "value"
      }
    ],
    "outputs": [
      {
        "id": "result",
        "label": "Transformed output",
        "direction": "output",
        "schema": {
          "type": "object",
          "properties": {}
        },
        "required": true,
        "handle": "result"
      }
    ],
    "parameters": [
      {
        "type": "object",
        "id": "value",
        "label": "Input value",
        "required": true,
        "placeholder": "Value to transform"
      }
    ]
  },
  {
    "kind": "core.flow.merge",
    "display": {
      "name": "Merge",
      "description": "Merges multiple branch outputs into a single normalised output object.",
      "category": "Utility",
      "labels": [
        "flow",
        "merge",
        "join"
      ],
      "icon": {
        "type": "catalogue",
        "name": "ti-tool"
      },
      "color": "#0d9488",
      "width": 96,
      "height": 96
    },
    "inputs": [
      {
        "id": "values",
        "label": "Branch outputs",
        "direction": "input",
        "schema": {
          "type": "model",
          "name": "Array"
        },
        "required": true,
        "handle": "values"
      }
    ],
    "outputs": [
      {
        "id": "merged",
        "label": "Merged output",
        "direction": "output",
        "schema": {
          "type": "object",
          "properties": {}
        },
        "required": true,
        "handle": "merged"
      }
    ],
    "parameters": [
      {
        "type": "object",
        "id": "values",
        "label": "Branch outputs",
        "required": true,
        "placeholder": "Outputs to merge"
      }
    ]
  },
  {
    "kind": "core.flow.parallel",
    "display": {
      "name": "Parallel",
      "description": "Splits execution into concurrent branches. All branches run in parallel and outputs are collected.",
      "category": "Flow Control",
      "labels": [
        "flow",
        "parallel",
        "concurrent"
      ],
      "icon": {
        "type": "catalogue",
        "name": "ti-arrows-split-2"
      },
      "color": "#f59e0b",
      "width": 96,
      "height": 96
    },
    "inputs": [
      {
        "id": "value",
        "label": "Input value",
        "direction": "input",
        "schema": {
          "type": "object",
          "properties": {}
        },
        "required": true,
        "handle": "value"
      }
    ],
    "outputs": [
      {
        "id": "branches",
        "label": "Branches",
        "direction": "output",
        "schema": {
          "type": "model",
          "name": "Array"
        },
        "required": true,
        "handle": "branches"
      }
    ],
    "parameters": [
      {
        "type": "object",
        "id": "value",
        "label": "Input value",
        "required": true,
        "placeholder": "Value to fan out"
      }
    ]
  },
  {
    "kind": "core.flow.return",
    "display": {
      "name": "Return",
      "description": "Normalises the input into the final workflow output object.",
      "category": "Utility",
      "labels": [
        "flow",
        "return",
        "output"
      ],
      "icon": {
        "type": "catalogue",
        "name": "ti-tool"
      },
      "color": "#0d9488",
      "width": 96,
      "height": 96
    },
    "inputs": [
      {
        "id": "value",
        "label": "Input value",
        "direction": "input",
        "schema": {
          "type": "object",
          "properties": {}
        },
        "required": true,
        "handle": "value"
      }
    ],
    "outputs": [
      {
        "id": "result",
        "label": "Returned output",
        "direction": "output",
        "schema": {
          "type": "object",
          "properties": {}
        },
        "required": true,
        "handle": "result"
      }
    ],
    "parameters": [
      {
        "type": "object",
        "id": "value",
        "label": "Input value",
        "required": true,
        "placeholder": "Value to normalise"
      }
    ]
  },
  {
    "kind": "core.flow.switch",
    "display": {
      "name": "Switch",
      "description": "Multi-branch switch. Routes the input to the first matching case output, or the default output.",
      "category": "Flow Control",
      "labels": [
        "flow",
        "switch",
        "multi-branch"
      ],
      "icon": {
        "type": "catalogue",
        "name": "ti-arrows-split-2"
      },
      "color": "#f59e0b",
      "width": 120,
      "height": 140,
      "sizeRules": [
        {
          "type": "parameterCount",
          "parameter": "cases",
          "dimension": "height",
          "perItem": 24
        }
      ]
    },
    "inputs": [
      {
        "id": "value",
        "label": "Input value",
        "direction": "input",
        "schema": {
          "type": "object",
          "properties": {}
        },
        "required": true,
        "handle": "value"
      }
    ],
    "outputs": [
      {
        "id": "default",
        "label": "Default",
        "direction": "output",
        "schema": {
          "type": "object",
          "properties": {}
        },
        "required": true,
        "handle": "default"
      }
    ],
    "parameters": [
      {
        "type": "object",
        "id": "value",
        "label": "Input value",
        "required": true,
        "placeholder": "Value to switch on"
      },
      {
        "id": "cases",
        "label": "Switch cases",
        "type": "collection",
        "itemIdPath": "outputPort",
        "itemLabelPath": "label",
        "itemParameters": [
          {
            "id": "outputPort",
            "label": "Output port",
            "type": "string",
            "required": true
          },
          {
            "id": "label",
            "label": "Case label",
            "type": "string",
            "required": true
          },
          {
            "id": "mode",
            "label": "Mode",
            "type": "string",
            "defaultValue": "graphical"
          },
          {
            "id": "value",
            "label": "Value",
            "type": "string"
          },
          {
            "id": "code",
            "label": "Code",
            "type": "code"
          },
          {
            "id": "left",
            "label": "Left",
            "type": "string"
          },
          {
            "id": "operator",
            "label": "Operator",
            "type": "string"
          },
          {
            "id": "right",
            "label": "Right",
            "type": "string"
          }
        ],
        "metadata": {
          "decafGraph": "switch-cases"
        }
      },
      {
        "type": "boolean",
        "id": "hasDefault",
        "label": "Has default",
        "defaultValue": false
      }
    ],
    "dynamicPorts": [
      {
        "type": "repeatFromParameter",
        "parameter": "cases",
        "itemIdPath": "outputPort",
        "itemLabelPath": "label",
        "direction": "output",
        "portIdTemplate": "${id}"
      }
    ]
  },
  {
    "kind": "core.loop.foreach",
    "display": {
      "name": "GraphForeachLoopNode",
      "description": "Iterates over an array input and executes the body once per item (or per slice of items).",
      "category": "Loop",
      "labels": [
        "loop",
        "iteration",
        "foreach"
      ],
      "icon": {
        "type": "catalogue",
        "name": "ti-repeat"
      },
      "color": "#eab308",
      "width": 120,
      "height": 140
    },
    "inputs": [
      {
        "id": "items",
        "label": "Items",
        "direction": "input",
        "schema": {
          "type": "model",
          "name": "Array"
        },
        "required": true,
        "handle": "items"
      },
      {
        "id": "slice",
        "label": "Slice size",
        "direction": "input",
        "schema": {
          "type": "model",
          "name": "Number"
        },
        "required": true,
        "handle": "slice"
      }
    ],
    "outputs": [
      {
        "id": "item",
        "label": "item",
        "direction": "output",
        "schema": {
          "type": "object",
          "properties": {}
        },
        "required": true,
        "handle": "item"
      },
      {
        "id": "completed",
        "label": "completed",
        "direction": "output",
        "schema": {
          "type": "model",
          "name": "Array"
        },
        "required": true,
        "handle": "completed"
      }
    ],
    "parameters": [
      {
        "type": "object",
        "id": "items",
        "label": "Items",
        "required": true,
        "placeholder": "Array to iterate over"
      },
      {
        "type": "object",
        "id": "slice",
        "label": "Slice size",
        "required": true,
        "placeholder": "Items per iteration (default 1)"
      }
    ],
    "connections": [
      {
        "id": "loop",
        "label": "loop",
        "direction": "connection",
        "schema": {
          "type": "object",
          "properties": {}
        },
        "required": true,
        "handle": "loop",
        "connectionPolicy": {
          "allowSelf": true,
          "maxConnections": 1
        }
      }
    ]
  },
  {
    "kind": "core.loop.until",
    "display": {
      "name": "GraphUntilLoopNode",
      "description": "Repeats the body until the condition is true (post-condition, runs at least once).",
      "category": "Loop",
      "labels": [
        "loop",
        "conditional",
        "until"
      ],
      "icon": {
        "type": "catalogue",
        "name": "ti-repeat"
      },
      "color": "#eab308",
      "width": 96,
      "height": 96
    },
    "inputs": [
      {
        "id": "state",
        "label": "State",
        "direction": "input",
        "schema": {
          "type": "object",
          "properties": {}
        },
        "required": true,
        "handle": "state"
      }
    ],
    "outputs": [
      {
        "id": "stateOut",
        "label": "Final state",
        "direction": "output",
        "schema": {
          "type": "object",
          "properties": {}
        },
        "required": true,
        "handle": "state"
      }
    ],
    "parameters": [
      {
        "type": "object",
        "id": "state",
        "label": "State",
        "required": true,
        "placeholder": "Initial state"
      }
    ]
  },
  {
    "kind": "core.loop.while",
    "display": {
      "name": "GraphWhileLoopNode",
      "description": "Repeats the body while the condition is true (pre-condition).",
      "category": "Loop",
      "labels": [
        "loop",
        "conditional",
        "while"
      ],
      "icon": {
        "type": "catalogue",
        "name": "ti-repeat"
      },
      "color": "#eab308",
      "width": 96,
      "height": 96
    },
    "inputs": [
      {
        "id": "state",
        "label": "State",
        "direction": "input",
        "schema": {
          "type": "object",
          "properties": {}
        },
        "required": true,
        "handle": "state"
      }
    ],
    "outputs": [
      {
        "id": "stateOut",
        "label": "Final state",
        "direction": "output",
        "schema": {
          "type": "object",
          "properties": {}
        },
        "required": true,
        "handle": "state"
      }
    ],
    "parameters": [
      {
        "type": "object",
        "id": "state",
        "label": "State",
        "required": true,
        "placeholder": "Initial state"
      }
    ]
  },
  {
    "kind": "core.trigger.chat",
    "display": {
      "name": "Chat trigger",
      "description": "Starts the workflow when a chat message is received. Emits message, sessionId, and userId.",
      "category": "Trigger",
      "labels": [
        "trigger",
        "chat",
        "entrypoint"
      ],
      "icon": {
        "type": "catalogue",
        "name": "ti-bolt"
      },
      "color": "#3b82f6",
      "width": 96,
      "height": 96
    },
    "inputs": [],
    "outputs": [
      {
        "id": "message",
        "label": "Message",
        "direction": "output",
        "schema": {
          "type": "model",
          "name": "String"
        },
        "required": true,
        "handle": "message"
      },
      {
        "id": "sessionId",
        "label": "Session ID",
        "direction": "output",
        "schema": {
          "type": "model",
          "name": "String"
        },
        "required": true,
        "handle": "sessionId"
      },
      {
        "id": "userId",
        "label": "User ID",
        "direction": "output",
        "schema": {
          "type": "model",
          "name": "String"
        },
        "required": true,
        "handle": "userId"
      }
    ],
    "parameters": []
  },
  {
    "kind": "core.trigger.event",
    "display": {
      "name": "Event trigger",
      "description": "Starts the workflow when an event is published on the configured internal event bus topic.",
      "category": "Trigger",
      "labels": [
        "trigger",
        "event",
        "bus"
      ],
      "icon": {
        "type": "catalogue",
        "name": "ti-bolt"
      },
      "color": "#3b82f6",
      "width": 96,
      "height": 96
    },
    "inputs": [],
    "outputs": [
      {
        "id": "payload",
        "label": "Event payload",
        "direction": "output",
        "schema": {
          "type": "object",
          "properties": {}
        },
        "required": true,
        "handle": "payload"
      }
    ],
    "parameters": []
  },
  {
    "kind": "core.trigger.form",
    "display": {
      "name": "Form trigger",
      "description": "Starts the workflow when a generated form is submitted. Field definitions drive the form schema.",
      "category": "Trigger",
      "labels": [
        "trigger",
        "form",
        "public"
      ],
      "icon": {
        "type": "catalogue",
        "name": "ti-bolt"
      },
      "color": "#3b82f6",
      "width": 96,
      "height": 96
    },
    "inputs": [],
    "outputs": [
      {
        "id": "payload",
        "label": "Form submission",
        "direction": "output",
        "schema": {
          "type": "object",
          "properties": {}
        },
        "required": true,
        "handle": "payload"
      }
    ],
    "parameters": []
  },
  {
    "kind": "core.trigger.manual",
    "display": {
      "name": "Manual trigger",
      "description": "Starts the workflow when the user clicks Run. The input form is generated from the trigger's input schema.",
      "category": "Trigger",
      "labels": [
        "trigger",
        "manual",
        "entrypoint"
      ],
      "icon": {
        "type": "catalogue",
        "name": "ti-bolt"
      },
      "color": "#3b82f6",
      "width": 96,
      "height": 96
    },
    "inputs": [],
    "outputs": [
      {
        "id": "payload",
        "label": "Trigger payload",
        "direction": "output",
        "schema": {
          "type": "object",
          "properties": {}
        },
        "required": true,
        "handle": "payload"
      }
    ],
    "parameters": []
  },
  {
    "kind": "core.trigger.schedule",
    "display": {
      "name": "Schedule trigger",
      "description": "Starts the workflow on a cron-like schedule with timezone support.",
      "category": "Trigger",
      "labels": [
        "trigger",
        "schedule",
        "cron"
      ],
      "icon": {
        "type": "catalogue",
        "name": "ti-bolt"
      },
      "color": "#3b82f6",
      "width": 96,
      "height": 96
    },
    "inputs": [],
    "outputs": [
      {
        "id": "payload",
        "label": "Scheduled payload",
        "direction": "output",
        "schema": {
          "type": "object",
          "properties": {}
        },
        "required": true,
        "handle": "payload"
      }
    ],
    "parameters": []
  },
  {
    "kind": "core.trigger.webhook",
    "display": {
      "name": "Webhook trigger",
      "description": "Starts the workflow when an HTTP request is received on the configured path and method.",
      "category": "Trigger",
      "labels": [
        "trigger",
        "webhook",
        "http"
      ],
      "icon": {
        "type": "catalogue",
        "name": "ti-bolt"
      },
      "color": "#3b82f6",
      "width": 96,
      "height": 96
    },
    "inputs": [],
    "outputs": [
      {
        "id": "payload",
        "label": "Request payload",
        "direction": "output",
        "schema": {
          "type": "object",
          "properties": {}
        },
        "required": true,
        "handle": "payload"
      }
    ],
    "parameters": []
  },
  {
    "kind": "core.utility.log",
    "display": {
      "name": "Utility Log",
      "description": "Logs the input value to the run's ctx.logger at a configurable level and forwards it unchanged.",
      "category": "Utility",
      "labels": [
        "utility",
        "log",
        "debug",
        "observability"
      ],
      "icon": {
        "type": "catalogue",
        "name": "ti-tool"
      },
      "color": "#0d9488",
      "width": 96,
      "height": 96
    },
    "inputs": [
      {
        "id": "value",
        "label": "Input value",
        "direction": "input",
        "schema": {
          "type": "object",
          "properties": {}
        },
        "required": true,
        "handle": "value"
      }
    ],
    "outputs": [
      {
        "id": "logged",
        "label": "Logged value",
        "direction": "output",
        "schema": {
          "type": "object",
          "properties": {}
        },
        "required": true,
        "handle": "logged"
      }
    ],
    "parameters": [
      {
        "type": "object",
        "id": "value",
        "label": "Input value",
        "required": true,
        "placeholder": "Value to log"
      },
      {
        "type": "string",
        "id": "level",
        "label": "Log level",
        "defaultValue": "info"
      }
    ]
  }
] as unknown as GraphNodeManifest[];
