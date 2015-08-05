import Platform from "./framesynthesis/Platform";
import Debug from "./framesynthesis/Debug";

export default class AudioManager {
	constructor(synthesizer, bufferSize = 1024) {
		this.synthesizer = synthesizer;
		this.bufferSize = bufferSize;

		try {
			if (Platform.isiOS()) {
				this.context = new webkitAudioContext();
			} else {
				this.context = new AudioContext();
			}
		} catch (e) {
			Debug.log("error: This browser does not support Web Audio API.");
			return;
		}
		
		this.buffer = new Float32Array(this.bufferSize);
		
		this.scriptProcessor = this.context.createScriptProcessor(this.bufferSize, 0, 2);
		this.scriptProcessor.onaudioprocess = e => this.process(e);
		this.scriptProcessor.connect(this.context.destination);

		// Prevent GC
		// ref. http://stackoverflow.com/questions/24338144/chrome-onaudioprocess-stops-getting-called-after-a-while
		window.savedReference = this.scriptProcessor;
		
		Debug.log("  Sampling rate : " + this.context.sampleRate + " Hz");
		Debug.log("  Buffer size   : " + this.scriptProcessor.bufferSize + " samples");
	}
	
	process(e) {
		let outL = e.outputBuffer.getChannelData(0);
		let outR = e.outputBuffer.getChannelData(1);
		
		this.synthesizer.render(this.buffer, this.context.sampleRate);
		
		for (let i = 0; i < this.bufferSize; i++) {
			outL[i] = this.buffer[i];
			outR[i] = this.buffer[i];
		}
	}
}

