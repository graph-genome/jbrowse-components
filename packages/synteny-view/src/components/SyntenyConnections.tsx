import Path from 'svg-path-generator'
import { SyntenyViewModel } from '../model'
import { yPos, getPxFromCoordinate, cheight } from '../util'

const [LEFT, , RIGHT] = [0, 1, 2, 3]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default (pluginManager: any) => {
  const { jbrequire } = pluginManager
  const { getConf } = jbrequire('@gmod/jbrowse-core/configuration')
  const { observer } = jbrequire('mobx-react')
  const React = jbrequire('react')
  const { useState } = jbrequire('react')

  return observer(
    ({
      model,
      height,
      syntenyGroup,
    }: {
      model: SyntenyViewModel
      height: number
      syntenyGroup: string
    }) => {
      const { views, showIntraviewLinks } = model
      const features = model.getMatchedSyntenyFeatures(syntenyGroup)
      const layoutMatches = model.getMatchedFeaturesInLayout(
        syntenyGroup,
        features,
      )
      const [mouseoverElt, setMouseoverElt] = useState()
      return (
        <g
          stroke="#333"
          fill="none"
          data-testid={
            layoutMatches.length ? `synteny-view-loaded` : 'synteny-view'
          }
        >
          {layoutMatches.map(chunk => {
            const ret = []
            // we follow a path in the list of chunks, not from top to bottom, just in series
            // following x1,y1 -> x2,y2
            for (let i = 0; i < chunk.length - 1; i += 1) {
              const { layout: c1, feature: f1, level: level1 } = chunk[i]
              const { layout: c2, feature: f2, level: level2 } = chunk[i + 1]

              if (!c1 || !c2) {
                console.warn('received null layout for a overlay feature')
                return null
              }

              // disable rendering connections in a single level
              if (!showIntraviewLinks && level1 === level2) {
                return null
              }

              // flipMultiplier combines with normal directionality of the curve
              const flipMultipliers = views.map(v =>
                v.horizontallyFlipped ? -1 : 1,
              )

              const x11 = getPxFromCoordinate(views[level1], c1[LEFT])
              const x12 = getPxFromCoordinate(views[level1], c1[RIGHT])
              const x21 = getPxFromCoordinate(views[level2], c2[LEFT])
              const x22 = getPxFromCoordinate(views[level2], c2[RIGHT])

              const tracks = views.map(view =>
                model.getSyntenyTrackFromView(view, syntenyGroup),
              )

              const y1 =
                yPos(
                  getConf(tracks[0], 'configId'),
                  level1,
                  views,
                  tracks,
                  c1,
                ) + (level1 < level2 ? cheight(c1) : 0)
              const y2 =
                yPos(
                  getConf(tracks[1], 'configId'),
                  level2,
                  views,
                  tracks,
                  c2,
                ) + (level2 < level1 ? cheight(c2) : 0)

              ret.push(
                <polygon
                  key={`${f1.id()}-${f2.id()}`}
                  points={`${x11},${y1} ${x12},${y1} ${x22},${y2}, ${x21},${y2}`}
                  style={{ fill: 'rgba(255,100,100,0.5)' }}
                />,
              )
            }
            return ret
          })}
        </g>
      )
    },
  )
}