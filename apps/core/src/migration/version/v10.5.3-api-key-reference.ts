import type { Db } from 'mongodb'

import { defineMigration } from '../helper'

export default defineMigration('v10.5.3-api-key-reference', async (db: Db) => {
  const keys = db.collection('apikey')
  await keys.updateMany(
    {
      referenceId: { $exists: false },
      userId: { $type: ['string', 'objectId'] },
    },
    [{ $set: { referenceId: { $toString: '$userId' } } }],
  )
  for (const field of [
    'remaining',
    'refillAmount',
    'refillInterval',
    'lastRefillAt',
    'lastRequest',
    'rateLimitMax',
    'rateLimitTimeWindow',
  ]) {
    await keys.updateMany(
      { [field]: { $exists: false } },
      { $set: { [field]: null } },
    )
  }
  await keys.updateMany(
    { configId: { $exists: false } },
    { $set: { configId: 'default' } },
  )
})
