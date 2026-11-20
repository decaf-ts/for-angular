import { NgModule } from "@angular/core";
import { GenuiActionProvenanceComponent } from "./components/genui-action-provenance/genui-action-provenance.component";
import { GenuiBlockComponent } from "./components/genui-block/genui-block.component";
import { GenuiFenceComponent } from "./components/genui-fence/genui-fence.component";
import { GenuiNodeComponent } from "./components/genui-node/genui-node.component";
import { GenuiPanelDockComponent } from "./components/genui-panel-dock/genui-panel-dock.component";

const COMPONENTS = [
  GenuiBlockComponent,
  GenuiFenceComponent,
  GenuiNodeComponent,
  GenuiPanelDockComponent,
  GenuiActionProvenanceComponent,
];

/**
 * @description NgModule exporting the GenUI renderer components
 * @summary Groups the block, fence, node, panel dock, and action-provenance
 * components for apps that still use NgModule imports. Standalone consumers can
 * import the components directly instead.
 * @class GenuiModule
 */
@NgModule({
  imports: COMPONENTS,
  exports: COMPONENTS,
})
export class GenuiModule {}
