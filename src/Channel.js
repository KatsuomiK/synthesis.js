import MyMath from './framesynthesis/MyMath'
import Voice from './Voice'

const VOICE_MAX = 32

export default class Channel {
  reset () {
    this.voices = []
    for (let i = 0; i < VOICE_MAX; i++) {
      this.voices[i] = new Voice(this)
    }

    this.keyState = []

    // General MIDI default
    this.volume = 100
    this.pan = 64
    this.expression = 127

    this.damperPedal = false

    this.pitchBend = 0
    this.modulationWheel = 0

    // preallocate channel buffer with margin
    this.channelBuffer = new Float32Array(4096)
  }

  noteOn (note, velocity) {
    this.keyState[note] = true

    // stop same notes
    for (let i = 0; i < VOICE_MAX; i++) {
      if (this.voices[i].isPlaying() && this.voices[i].note === note) {
        this.voices[i].stop()
      }
    }

    // play note
    for (let i = 0; i < VOICE_MAX; i++) {
      if (!this.voices[i].isPlaying()) {
        this.voices[i].play(note, velocity)
        break
      }
    }
  }

  noteOff (note, velocity) {
    this.keyState[note] = false

    if (this.damperPedal) {
      return
    }

    // stop notes
    for (let i = 0; i < VOICE_MAX; i++) {
      if (this.voices[i].isPlaying() && this.voices[i].note === note) {
        this.voices[i].stop()
      }
    }
  }

  allNotesOff () {
    for (let i = 0; i < VOICE_MAX; i++) {
      if (this.voices[i].isPlaying()) {
        this.voices[i].stop()
      }
    }
  }

  damperPedalOn () {
    this.damperPedal = true
  }

  damperPedalOff () {
    this.damperPedal = false

    for (let i = 0; i < VOICE_MAX; i++) {
      if (this.keyState[this.voices[i].note] === false) {
        this.voices[i].stop()
      }
    }
  }

  programChange (programNumber) {
  }

  setPitchBend (bend) {
    this.pitchBend = bend * 2 / 8192
  }

  setModulationWheel (wheel) {
    this.modulationWheel = wheel / 127
  }

  setVolume (volume) {
    this.volume = volume
  }

  setPan (pan) {
    this.pan = pan
  }

  setExpression (expression) {
    this.expression = expression
  }

  render (bufferL, bufferR, sampleRate) {
    for (let i = 0; i < bufferL.length; i++) {
      this.channelBuffer[i] = 0
    }

    for (let i = 0; i < VOICE_MAX; i++) {
      this.voices[i].render(this.channelBuffer, bufferL.length, sampleRate)
    }

    const gain = (this.volume / 127) * (this.expression / 127)
    const gainL = gain * MyMath.clampedLinearMap(this.pan, 64, 127, 1, 0)
    const gainR = gain * MyMath.clampedLinearMap(this.pan, 0, 64, 0, 1)

    for (let i = 0; i < bufferL.length; i++) {
      bufferL[i] += this.channelBuffer[i] * gainL
      bufferR[i] += this.channelBuffer[i] * gainR
    }
  }
}
