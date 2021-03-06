import Debug from './framesynthesis/Debug'
import Platform from './framesynthesis/Platform'
import AudioManager from './AudioManager'
import Channel from './Channel'

const CHANNEL_MAX = 16

export default class Synthesizer {
  constructor (options) {
    this.options = options

    this.channels = []
    for (let i = 0; i < CHANNEL_MAX; i++) {
      this.channels[i] = new Channel()
    }

    this.reset()

    this.audioManager = null
    if (!Platform.isiOS()) {
      this.createAudioManager()
    }
  }

  createAudioManager () {
    if (!this.audioManager) {
      Debug.log('Initializing Web Audio')
      this.audioManager = new AudioManager(this)
    }
  }

  reset () {
    Debug.log('Initializing Synthesizer')

    for (let i = 0; i < CHANNEL_MAX; i++) {
      this.channels[i].reset()
    }
  }

  render (bufferL, bufferR, sampleRate) {
    for (let i = 0; i < bufferL.length; i++) {
      bufferL[i] = 0
      bufferR[i] = 0
    }

    for (let i = 0; i < CHANNEL_MAX; i++) {
      this.channels[i].render(bufferL, bufferR, sampleRate)
    }
  }

  processMIDIMessage (data) {
    if (!data) {
      return
    }

    // avoid iOS audio restriction
    this.createAudioManager()

    const statusByte = data[0]
    if (!statusByte) {
      return
    }

    const statusUpper4bits = statusByte >> 4
    const channel = statusByte & 0xf
    const midiChannel = channel + 1

    if (statusUpper4bits === 0x9) {
      const note = data[1]
      const velocity = data[2]

      this.log(`Ch. ${midiChannel} Note On  note: ${note} velocity: ${velocity}`)
      this.channels[channel].noteOn(note, velocity)
    }
    if (statusUpper4bits === 0x8) {
      const note = data[1]
      const velocity = data[2]

      this.log(`Ch. ${midiChannel} Note Off note: ${note} velocity: ${velocity}`)
      this.channels[channel].noteOff(note, velocity)
    }

    if (statusUpper4bits === 0xc) {
      const programNumber = data[1]

      this.log(`Ch. ${midiChannel} Program Change: ${programNumber}`)
      this.channels[channel].programChange(programNumber)
    }

    if (statusUpper4bits === 0xe) {
      const lsb = data[1]
      const msb = data[2]
      const bend = ((msb << 7) | lsb) - 8192

      this.log(`Ch. ${midiChannel} Pitch bend: ${bend}`)
      this.channels[channel].setPitchBend(bend)
    }
    if (statusUpper4bits === 0xb) {
      const controlNumber = data[1]
      const value = data[2]

      if (controlNumber === 1) {
        this.log(`Ch. ${midiChannel} Modulation Wheel: ${value}`)
        this.channels[channel].setModulationWheel(value)
      }
      if (controlNumber === 7) {
        this.log(`Ch. ${midiChannel} Channel Volume: ${value}`)
        this.channels[channel].setVolume(value)
      }
      if (controlNumber === 10) {
        this.log(`Ch. ${midiChannel} Pan: ${value}`)
        this.channels[channel].setPan(value)
      }
      if (controlNumber === 11) {
        this.log(`Ch. ${midiChannel} Expression Controller: ${value}`)
        this.channels[channel].setExpression(value)
      }
      if (controlNumber === 64) {
        if (value >= 64) {
          this.log(`Ch. ${midiChannel} Damper Pedal On`)
          this.channels[channel].damperPedalOn()
        } else {
          this.log(`Ch. ${midiChannel} Damper Pedal Off`)
          this.channels[channel].damperPedalOff()
        }
      }
      if (controlNumber === 123) {
        if (value === 0) {
          this.log(`Ch. ${midiChannel} All Notes Off`)
          this.channels[channel].allNotesOff()
        }
      }
    }
  }

  log (message) {
    if (this.options && this.options.verbose) {
      Debug.log(message)
    }
  }
}
