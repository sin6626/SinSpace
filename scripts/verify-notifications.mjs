import assert from 'node:assert/strict';
import { getNotification, notificationCopy, notificationSettings } from '../apps/web/lib/notification-copy.ts';
assert.equal(getNotification({ type: 'POST_CREATE', data: { isPublished: true } }), notificationCopy.POST_CREATE);
for (const data of [null, {}, { isPublished: false }, { isPublished: 'true' }]) {
  assert.equal(getNotification({ type: 'POST_CREATE', data }), null);
}
assert.equal(getNotification({ type: 'POST_UPDATE' }), notificationCopy.POST_UPDATE);
assert.equal(getNotification({ type: 'POST_DELETE' }), notificationCopy.POST_DELETE);
for (const message of [null, 'POST_CREATE', {}, { type: 'health_check' }, { type: 'AUTH_FAILED' }, { type: 'VISITOR_ONLINE' }]) assert.equal(getNotification(message), null);
assert.equal(notificationSettings.timeout, 5000);
console.log('PASS public article notifications, unpublished filtering and internal event exclusion');
