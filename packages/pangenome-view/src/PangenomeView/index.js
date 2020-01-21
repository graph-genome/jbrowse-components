export default ({ jbrequire }) => {
  const ViewType = jbrequire(
    '@gmod/jbrowse-core/pluggableElementTypes/ViewType',
  )

  const ReactComponent = jbrequire(require('./components/PangenomeView'))
  const { stateModel } = jbrequire(require('./models/PangenomeView'))

  return new ViewType({ name: 'PangenomeView', stateModel, ReactComponent })
}
