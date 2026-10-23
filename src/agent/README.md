# `@decaf-ts/for-angular/agent`

Agent conversation UI for a graph workflow run. The entry point ships the
standalone `ngx-decaf-agent-chat` component, its injectable transport contract
and the default SSE-backed transport, the Decaf composer/message models, the
event-envelope fold, and the translation fallback pipe.

The component composes the graph I/O viewer from the
[`/diagrams`](../diagrams) entry point through its public specifier; it never
reaches into another entry point's source tree.

## Install

```bash
npm install @decaf-ts/for-angular @decaf-ts/as-graph@^0.6.0 ng-diagram@^1.4.0
```

`@decaf-ts/as-graph` and `ng-diagram` are **optional peer dependencies** of
`@decaf-ts/for-angular`. `/agent` reuses the `/diagrams` transcript viewer, so
it needs the same optional peers as that entry point. It also uses the required
root peers: `@angular/*`, `@ionic/angular`, `@ngx-translate/core`, `rxjs`,
`@decaf-ts/core`, `@decaf-ts/db-decorators`, `@decaf-ts/decorator-validation`
and `@decaf-ts/ui-decorators`.

### Compatibility

| Package | Tested range |
| --- | --- |
| `@angular/*` | `21.2.17` – `21.2.25` |
| `@decaf-ts/as-graph` | `^0.6.0` (optional peer) |
| `ng-diagram` | `^1.4.0` (optional peer) |
| `@decaf-ts/for-angular` | `0.11.x` |

`@decaf-ts/as-graph` is MIT-licensed; `ng-diagram` is Apache-2.0. See the
package `NOTICE` and the [`/diagrams` install note](../diagrams/README.md)
for the shared optional-peer guidance.

## Usage

```ts
import { Component } from '@angular/core';
import {
  AGENT_CHAT_TRANSPORT,
  AgentChatComponent,
  AgentChatTransport,
} from '@decaf-ts/for-angular/agent';

@Component({
  standalone: true,
  imports: [AgentChatComponent],
  template: `
    <ngx-decaf-agent-chat
      [workflowId]="workflowId"
      [knowledgeSources]="knowledgeSources"
    />
  `,
})
export class WorkflowChatComponent {
  readonly workflowId = 'my-workflow';
  readonly knowledgeSources = [];
}

// Optional: replace the default graph transport with a scripted or
// application-specific implementation.
export const transportProvider = {
  provide: AGENT_CHAT_TRANSPORT,
  useFactory: (): AgentChatTransport => new MyTransport(),
};
```

### API

| Member | Type | Purpose |
| --- | --- | --- |
| `workflow` | `GraphWorkflowDocument \| null` (input) | Inline workflow document; overrides `workflowId`. |
| `workflowId` | `string \| null` (input) | Backend workflow id used when no inline document is set. |
| `sessionId` | `string \| null` (input) | Conversation session id; generated per service when omitted. |
| `headerTitleKey` | `string` (input) | i18n key for the header title. |
| `headerTitleFallback` | `string` (input) | Fallback header title. |
| `knowledgeSources` | `AgentChatKnowledgeSource[]` (input) | Knowledge-base options in the composer. |

Selector: `<ngx-decaf-agent-chat>`.

### Exported surface

- `AgentChatComponent`
- `AgentChatTransport`, `AgentChatTransportHandlers`, `AgentChatRunDescriptor`,
  `AgentChatSendRequest`, and the supporting view/attachment types
- `AGENT_CHAT_TRANSPORT`, `AGENT_CHAT_SESSION_PREFIX`
- `AgentChatService`, `GraphRunAgentChatTransport`, `agentChatFoldEnvelope`
- `AgentChatComposerModel`, `AgentChatMessageModel`
- `AgentTranslateFallbackPipe`

## Controlled-view contract

The component owns only presentation state. Conversation state lives in
`AgentChatService`, and every run is delegated to the injected
`AGENT_CHAT_TRANSPORT`. File attachments are metadata only — their contents are
never read. Override `AGENT_CHAT_TRANSPORT` to plug in a scripted or
application-specific transport.

## License

`@decaf-ts/as-graph` and `ng-diagram` are external optional peers and are not
vendored.
