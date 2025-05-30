/**
 * @description Abstract base class for dynamic Angular modules
 * @summary The DynamicModule serves as a base class for Angular modules that need to be
 * dynamically loaded or configured at runtime. It provides a common type for the rendering
 * engine to identify and work with dynamic modules.
 * @class DynamicModule
 * @example
 * ```typescript
 * @NgModule({
 *   declarations: [MyComponent],
 *   imports: [CommonModule]
 * })
 * export class MyDynamicModule extends DynamicModule {}
 * ```
 */
export abstract class DynamicModule {}
