import { AceTrace, RecordReplayer as AceRecordReplayer } from "@cs124/ace-recorder"
import { RecordReplayer as AudioRecordReplayer } from "@cs124/audio-recorder"
import type { Ace } from "ace-builds"
import EventEmitter from "events"

export class RecordReplayer extends EventEmitter {
  private aceRecordReplayer
  private audioRecordReplayer = new AudioRecordReplayer()
  private _state: RecordReplayer.State = "empty"
  public duration: number | undefined

  public constructor(editor: Ace.Editor) {
    super()
    this.aceRecordReplayer = new AceRecordReplayer(editor)
    this.aceRecordReplayer.addListener("state", (state) => {
      if (state === "paused" && this._state !== "paused") {
        this.state = "paused"
      }
    })
    this.audioRecordReplayer.addListener("state", (state) => {
      if (state === "paused" && this._state !== "paused") {
        this.state = "paused"
      }
    })
    this.emit("state", "empty")
  }
  public get state() {
    return this._state
  }
  private set state(state: RecordReplayer.State) {
    this._state = state
    this.emit("state", this._state)
  }
  public async startRecording() {
    if (this._state === "playing" || this._state === "recording") {
      throw new Error("Still playing or recording")
    }
    await this.audioRecordReplayer.startRecording()
    this.aceRecordReplayer.startRecording()
    this.state = "recording"
  }
  public async stopRecording() {
    if (this._state !== "recording") {
      throw new Error("Not recording")
    }
    await this.audioRecordReplayer.stopRecording()
    this.aceRecordReplayer.stopRecording()
    if (this.aceRecordReplayer.state === "paused" && this.audioRecordReplayer.state === "paused") {
      this.state = "paused"
      const aceDuration = this.aceRecordReplayer.duration
      const audioDuration = this.audioRecordReplayer.duration * 1000
      if (Math.abs(aceDuration - audioDuration) > 100) {
        throw new Error("Recordings do not have equal length")
      }
      this.duration = Math.min(aceDuration, audioDuration)
      // this.emit("content", url)
    } else {
      this.state = "empty"
      this.duration = undefined
    }
  }
  public pause() {
    if (this._state !== "playing") {
      throw new Error("Not playing")
    }
    this.aceRecordReplayer.pause()
    this.audioRecordReplayer.pause()
    this.state = "paused"
  }
  public play() {
    if (this._state !== "paused") {
      throw new Error("No content or already playing or recording")
    }
    this.aceRecordReplayer.play()
    this.audioRecordReplayer.play()
    this.state = "playing"
  }
  public clear() {
    this.aceRecordReplayer.clear()
    this.audioRecordReplayer.clear()
    this.state = "empty"
  }
  public get content(): Promise<RecordReplayer.Content> {
    if (this._state === "empty") {
      throw new Error("No content loaded")
    }
    return this.audioRecordReplayer.base64.then((audio) => {
      return { audio, trace: this.aceRecordReplayer.trace! }
    })
  }
  public set currentTime(currentTime: number) {
    if (this._state === "empty") {
      throw new Error("No content loaded")
    }
    this.audioRecordReplayer.currentTime = currentTime / 1000
    this.aceRecordReplayer.currentTime = currentTime
  }
  public set percent(percent: number) {
    if (this._state === "empty") {
      throw new Error("No trace loaded")
    }
    if (percent < 0 || percent > 100) {
      throw new Error("Bad percent value")
    }
    this.currentTime = this.duration! * (percent / 100)
  }
}

export namespace RecordReplayer {
  export type State = "empty" | "paused" | "recording" | "playing"
  export type Content = { audio: string; trace: AceTrace }
}