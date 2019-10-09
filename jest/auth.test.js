const phone = require('./helpers/phone')
const { createClientWithServer } = require('./helpers/index')
const { clearOperatorDb } = require('./helpers/operatorPostgres')
const { v4Regexp } = require('./helpers/regexp')

jest.useFakeTimers()

describe('Authentication', () => {
  let client

  beforeAll(async () => {
    client = await createClientWithServer()
    await client.connect()
  })

  beforeEach(async () => {
    await phone.clearStorage()
    await phone.createAccount({ firstName: 'Foo', lastName: 'Barsson' })
  })

  afterEach(async () => {
    await phone.clearStorage()
  })

  afterAll(async () => {
    await clearOperatorDb()
    await new Promise((resolve) => client.server.close(resolve))
  })

  it('Client provides a proper auth url and id', async () => {
    const { url, id } = await client.initializeAuthentication()
    expect(url).toEqual(expect.stringContaining('egendata://account'))
    expect(id).toMatch(v4Regexp)
  })

  it('Auth flow for new connection', async () => {
    // Initial state, expect no connections
    const connectionsBefore = await phone.getConnections()
    expect(connectionsBefore).toEqual({})

    // Client library provides auth url and session id
    const { url, id } = await client.initializeAuthentication()

    // Scan auth and do ping-pong
    const { connectionRequest } = await phone.handleAuthCode({ code: url })

    // Approve it!
    const approved = new Map() // no permissions in this connection
    await phone.approveConnection(connectionRequest, approved)

    // Get connections again
    const connectionsAfter = await phone.getConnections()

    // After state, expect one new connection in phone
    expect(Object.keys(connectionsAfter).length).toBe(1)
    const connectionKey = Object.keys(connectionsAfter)[0]
    expect(connectionsAfter[connectionKey].connectionId).toMatch(v4Regexp)
    expect(connectionsAfter[connectionKey].serviceId).toContain('http://')

    // After state, expect connection in client for the session id
    const connectionEntryInClient = await client.keyValueStore.load(`authentication|>${id}`)
    expect(connectionEntryInClient).toEqual(expect.any(String))
  })

  it('Auth flow for existing connection (login)', async () => {
    // Create a connection for account <-> service
    await client
      .initializeAuthentication()
      .then(({ url }) => phone.handleAuthCode({ code: url }))
      .then(({ connectionRequest }) => phone.approveConnection(connectionRequest))

    // Prepare login
    const { url, id } = await client.initializeAuthentication()
    const { sessionId, existingConnection } = await phone.handleAuthCode({ code: url })

    // Check that sessionId is id and that phone has the right existing connection
    expect(sessionId).toBe(id)
    expect(existingConnection.serviceId).toBe(client.config.clientId)

    // Approve login
    await phone.approveLogin({ connection: existingConnection, sessionId })

    // After state, expect connection in client for the session id
    const connectionEntryInClient = await client.keyValueStore.load(`authentication|>${id}`)
    expect(connectionEntryInClient).toEqual(expect.any(String))
  })
})
