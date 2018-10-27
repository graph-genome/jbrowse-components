import React from 'react'
import PropTypes from 'prop-types'
import Block from './Block'

export default function ScaleBar({ style, height, blocks, offsetPx, bpPerPx }) {
  const finalStyle = Object.assign({}, style, { height: `${height}px` })
  return (
    <div style={finalStyle} className="ScaleBar">
      {blocks.map(block => {
        const { refName, start, end } = block
        return (
          <Block
            {...block}
            width={block.widthPx}
            key={`${refName}:${start}..${end}`}
            offset={offsetPx}
            bpPerPx={bpPerPx}
          >
            {block.start} {block.end}{' '}
          </Block>
        )
      })}
    </div>
  )
}
ScaleBar.defaultProps = { style: {}, blocks: [] }
ScaleBar.propTypes = {
  style: PropTypes.objectOf(PropTypes.any),
  height: PropTypes.number.isRequired,
  blocks: PropTypes.arrayOf(PropTypes.object),
  bpPerPx: PropTypes.number.isRequired,
  offsetPx: PropTypes.number.isRequired,
}
