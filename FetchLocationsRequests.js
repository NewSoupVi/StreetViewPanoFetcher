class RequestParams {
  constructor (radius, links, requestRadius = 45, simultaneousRequests = 5) {
    this.radius = radius
    this.useLinks = links
    this.requestRadius = requestRadius
    this.simultaneousRequests = simultaneousRequests
  }
}

class GetAllForAllRequest {
  constructor (params, service, inputText) {
    this.params = params
    this.streetViewService = service
    this.inputText = inputText
    this.done = new Deferred()
    this.individualRequests = []
    this.requestsLeftToDo = []

    this.idsToPanoObjects = {}

    this.parseInput()
  }

  parseInput () {
    // Split the input text into lines, and the lines into ids and latlngs.
    // Each line represents one starting point.

    const lines = this.inputText.split('\n')
    for (const line of lines) {
      if (!line) continue

      const linesplit = line.split(/[,\t ]/gm)

      const id = linesplit.shift()
      // Right now, it is always assumed that a line starts with a unique ID.
      // TODO: Change this such that if there is no ID, one is generated.

      const latlngs = []

      while (linesplit.length) {
        const nextLat = linesplit.shift()
        if (!nextLat) break
        const nextLng = linesplit.shift()

        latlngs.push([Number(nextLat), Number(nextLng)])
      }

      // TODO: Find center of polygon
      const nextRequest = new GetAllForOneRequest(id, this.params, this.streetViewService, latlngs)

      this.individualRequests.push(nextRequest)
      this.requestsLeftToDo.push(nextRequest)
    }
  }

  async doNextRequest (lastID = null) {
    if (lastID) console.log('Done with ' + lastID)

    if (this.requestsLeftToDo.length === 0) return

    const singleRequest = this.requestsLeftToDo.pop()

    console.log('Starting work on ' + singleRequest.id + '.')

    singleRequest.collectAdditionals().then(() => singleRequest.doRequest()).then(() => this.doNextRequest(lastID = singleRequest.id))
  }

  async doRequest () {
    // TODO: Rewrite this function such that multiple SingleRequests are started at once through a queue.

    for (let i = 0; i < this.params.simultaneousRequests; i++) {
      this.doNextRequest()
    }

    for (const req of this.individualRequests) {
      await req.done.promise
      this.idsToPanoObjects[req.id] = req.resultingPanos
    }

    this.done.resolve(this.idsToPanoObjects)

    return this.done.promise
  }
}
