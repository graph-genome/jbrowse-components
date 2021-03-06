import BoxRendererType, {
  LayoutSession,
} from '@gmod/jbrowse-core/pluggableElementTypes/renderers/BoxRendererType'
import MultiLayout from '@gmod/jbrowse-core/util/layouts/MultiLayout'
import { FloatingLayout, PrecomputedFloatingLayout } from './Layout'

class FloatingLayoutSession extends LayoutSession {
  makeLayout() {
    const { end, start } = this.region
    const widthPx = (end - start) / this.bpPerPx
    return new MultiLayout(FloatingLayout, { width: widthPx })
  }

  layoutIsValid(/* layout */) {
    return false // layout.left layout.width === this.width
  }
}

export default class extends BoxRendererType {
  createSession() {
    return new FloatingLayoutSession()
  }

  deserializeLayoutInClient(json) {
    return new PrecomputedFloatingLayout(json)
  }
}
