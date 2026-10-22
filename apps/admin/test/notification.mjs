import assert from 'node:assert/strict'
import { BrowserNotification } from '../src/utils/notification.ts'

let focused = false
let requested = 0
let requestResult = 'denied'
let requestError = false
let creationError = false
class Notification {
  static permission = 'denied'
  static async requestPermission() {
    requested++
    if (requestError) throw new Error('Permission unavailable')
    return requestResult
  }
  constructor(title, options) {
    if (creationError) throw new Error('Notification unavailable')
    this.title = title
    this.options = options
  }
}
globalThis.window = {}
globalThis.document = { hasFocus: () => focused }
globalThis.Notification = Notification
assert.equal(await new BrowserNotification().notice('title', 'body'), undefined)
window.Notification = Notification
assert.equal(await new BrowserNotification().notice('title', 'body'), undefined)
assert.equal(requested, 0)
Notification.permission = 'default'
assert.equal(await new BrowserNotification().notice('title', 'body'), undefined)
requestError = true
assert.equal(await new BrowserNotification().notice('title', 'body'), undefined)
Notification.permission = 'granted'
focused = true
assert.equal(await new BrowserNotification().notice('title', 'body'), undefined)
focused = false
const result = await new BrowserNotification().notice('title', 'body', { tag: 'check' })
assert.equal(result.title, 'title')
assert.deepEqual(result.options, { body: 'body', tag: 'check' })
creationError = true
assert.equal(await new BrowserNotification().notice('title', 'body'), undefined)
console.log('Unsupported, denied, failed, focused and granted notification paths settle correctly.')
