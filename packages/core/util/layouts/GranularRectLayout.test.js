import Layout from './GranularRectLayout'

describe('GranularRectLayout', () => {
  it('lays out non-overlapping features end to end', () => {
    const l = new Layout({ pitchX: 10, pitchY: 4 })
    const testRects = [
      ['1,0', 4133, 5923, 16],
      ['1,1', 11299, 12389, 16],
      ['1,2', 21050, 22778, 16],
      ['1,3', 41125, 47459, 16],
      ['1,4', 47926, 49272, 16],
      ['1,5', 50240, 52495, 16],
      ['1,6', 53329, 56283, 16],
      ['1,7', 59309, 79441, 16],
      ['1,8', 80359, 83196, 16],
      ['1,9', 92147, 94188, 16],
      ['1,10', 96241, 103626, 16],
      ['1,11', 104396, 108110, 16],
      ['1,12', 111878, 125251, 16],
      ['1,13', 125747, 128085, 16],
      ['1,14', 131492, 132641, 16],
      ['1,15', 133857, 134931, 16],
      ['1,16', 137023, 138220, 16],
      ['1,17', 140703, 145668, 16],
      ['1,18', 146045, 147059, 16],
      ['1,19', 162296, 165395, 16],
      ['1,20', 168531, 170795, 16],
      ['1,21', 174812, 180475, 16],
      ['1,22', 184302, 188826, 16],
      ['1,23', 189609, 191141, 16],
      ['1,24', 199799, 201389, 16],
      ['1,25', 203436, 211345, 16],
      ['1,26', 212100, 212379, 16],
      ['1,27', 213418, 214627, 16],
      ['1,28', 215115, 219344, 16],
      ['1,29', 220067, 222525, 16],
      ['1,30', 223308, 228141, 16],
      ['1,31', 234473, 236768, 16],
      ['1,32', 239691, 245015, 16],
    ]

    for (let i = 0; i < testRects.length; i += 1) {
      const top = l.addRect(...testRects[i])
      expect(top).toEqual(0)
    }
  })

  it('stacks up overlapping features', () => {
    const l = new Layout({ pitchX: 10, pitchY: 4 })

    const testRects = []
    for (let i = 1; i <= 20; i += 1) {
      testRects.push([`feature-${i}`, 100 * i - 60, 100 * i + 60, 1])
    }

    for (let i = 0; i < testRects.length; i += 1) {
      const top = l.addRect(...testRects[i])
      expect(top).toEqual((i % 2) * 4)
    }
  })

  it('discards regions', () => {
    const l = new Layout({ pitchX: 10, pitchY: 4 })
    for (let i = 0; i < 20; i += 1) {
      const top = l.addRect(
        `feature-${i}`,
        10000 * i + 4000,
        10000 * i + 16000,
        1,
      )
      expect(top).toEqual((i % 2) * 4)
    }

    expect(l.bitmap[0].rowState.bits.length).toBe(34809)
    expect(l.bitmap[1].rowState.bits.length).toBe(34809)
    l.discardRange(190000, 220000)
    expect(l.bitmap[0].rowState.bits.length).toBe(24802)
    expect(l.bitmap[1].rowState.bits.length).toBe(23802)
    l.discardRange(0, 100000)
    expect(l.bitmap[0].rowState.bits.length).toBe(19001)
    expect(l.bitmap[1].rowState.bits.length).toBe(23802)
    l.discardRange(0, 220000)
    expect(l.bitmap[0].rowState).toBeUndefined()
  })
})
