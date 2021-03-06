import EventEmitter from "events"
import AceRecordReplayer from "./ace/RecordReplayer"
import AudioRecordReplayer from "./audio/RecordReplayer"
import { AceTrace, IRecordReplayer } from "./types"

class RecordReplayer implements IRecordReplayer {
  private _ace
  private _audio = new AudioRecordReplayer()
  private emitter = new EventEmitter()
  private _state: IRecordReplayer.State = "paused"
  private readonly tolerance = 0.1

  constructor(...a: ConstructorParameters<typeof AceRecordReplayer>) {
    this._ace = new AceRecordReplayer(...a)

    this._audio.addStateListener((state) => {
      if (this._state === state) {
        return
      }
      if (this._ace.state !== state) {
        if (state === "paused") {
          try {
            this._ace.pause()
          } catch (err) {}
        }
      }
      this.state = state
    })
    this.audio.player.addEventListener("ended", () => {
      this.currentTime = 0
    })
    this.audio.player.addEventListener("waiting", () => {
      if (this._ace.state !== "paused") {
        try {
          this._ace.pause()
        } catch (err) {}
      }
    })
    this.audio.player.addEventListener("stalled", () => {
      if (this._ace.state !== "paused") {
        try {
          this._ace.pause()
        } catch (err) {}
      }
    })
    this.audio.player.addEventListener("playing", () => {
      if (this._ace.state !== "playing") {
        try {
          this._ace.currentTime = this._audio.currentTime
          this._ace.play()
        } catch (err) {}
      }
    })
    this.audio.player.addEventListener("pause", () => {
      if (this._ace.state !== "paused") {
        try {
          this._ace.pause()
        } catch (err) {}
      }
    })
    this.audio.player.addEventListener("timeupdate", () => {
      if (Math.abs(this._ace.currentTime - this._audio.currentTime) > this.tolerance) {
        this._ace.currentTime = this._audio.currentTime
      }
    })
  }
  public get state() {
    return this._state
  }
  private set state(state: IRecordReplayer.State) {
    if (state === this._state) {
      return
    }
    this._state = state
    this.emitter.emit("state", this._state)
  }
  public async play() {
    if (this.state !== "paused") {
      throw new Error("Not paused")
    }
    await this._audio.play()
    this.state = "playing"
  }
  public pause() {
    if (this.state !== "playing") {
      throw new Error("Not playing")
    }
    this._audio.pause()
    this.state = "paused"
  }
  public async record() {
    if (this.state !== "paused") {
      throw new Error("Not paused")
    }
    await this._audio.record()
    await this._ace.record()
    this.state = "recording"
  }
  public async stop() {
    if (this.state !== "recording") {
      throw new Error("Not recording")
    }
    await this._audio.stop()
    await this._ace.stop()
    if (Math.abs(this._audio.duration - this._ace.duration) > 100) {
      throw new Error(
        `Recordings do not have equal length: Audio ${this._audio.duration} <-> Ace ${this._ace.duration}`
      )
    }
    this.state = "paused"
  }
  public addStateListener(listener: (state: IRecordReplayer.State) => void) {
    this.emitter.addListener("state", listener)
  }
  public set src(src: RecordReplayer.Content | undefined) {
    if (this.state === "playing" || this.state === "recording") {
      throw new Error("Can't change source while recording or playing")
    }
    if (src) {
      this._ace.src = src.ace
      this._audio.src = src.audio
      this.state = "paused"
    } else {
      this._ace.src = undefined
      this._audio.src = ""
      this.state = "empty"
    }
  }
  public get src() {
    return this._ace.src ? { ace: this._ace.src, audio: this._audio.src } : undefined
  }
  public get currentTime() {
    return this._audio.currentTime
  }
  public set currentTime(currentTime: number) {
    this._audio.currentTime = currentTime
    this._ace.currentTime = currentTime
    this._ace.sync()
  }
  public get percent() {
    return this._audio.percent
  }
  public set percent(percent: number) {
    this._audio.percent = percent
    this._ace.percent = percent
    this._ace.sync()
  }
  public get ace() {
    return this._ace
  }
  public get audio() {
    return this._audio
  }
  public set playbackRate(playbackRate: number) {
    this._audio.playbackRate = playbackRate
    this._ace.playbackRate = playbackRate
  }
  public get playbackRate() {
    return this._audio.playbackRate
  }
  public get duration() {
    return this._audio.duration
  }
}

namespace RecordReplayer {
  export type Content = { audio: string; ace: AceTrace | undefined }
  export type State = IRecordReplayer.State
}

export default RecordReplayer
