const { Client } = require('pg')

const connectionString = `postgres://postgresuser:postgrespassword@localhost:${process.env.OPERATOR_PGPORT}`
const getClient = (schema) => new Client(`${connectionString}/${schema}`)

const clearOperatorDb = async () => {
  try {
    const client = getClient('egendata')

    await client.connect()
    await Promise.all([
      client.query('DELETE FROM account_keys'),
      client.query('DELETE FROM permissions'),
      client.query('DELETE FROM connections'),
      client.query('DELETE FROM services'),
      client.query('DELETE FROM accounts')
    ])
    await client.end()
  } catch (e) {
    console.error('Error clearing Operator DB!', e)
  }
}

const queryOperatorDb = async (sql, params = []) => {
  const client = new Client(`${connectionString}/egendata`)
  await client.connect()
  try {
    const result = await client.query(sql, params)
    return result
  } finally {
    await client.end()
  }
}

module.exports = {
  clearOperatorDb,
  queryOperatorDb
}
