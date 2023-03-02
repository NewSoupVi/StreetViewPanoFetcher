class RequestParams {
  constructor (radius, additionalStartingPoints, links, polygonMode, requestRadius = 45) {
    this.radius = radius
    this.useLinks = links
    this.requestRadius = requestRadius
  }
}

class GetAllForAllRequest {
  constructor (params, service, inputText) {
    this.params = params
    this.streetViewService = service
    this.inputText = inputText
    this.done = new Deferred()
    this.individualRequests = []

    this.parseInput()
  }

  parseInput () {
    // Split the input text into lines, and the lines into ids and latlngs.
    // Each line represents one starting point.

    const lines = this.inputText.split('\n')
    for (const line of lines) {
      if (!line) continue

      const linesplit = line.split(/[,\t ]/gm)

      console.log(linesplit)

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
    }
  }

  async doRequest () {
    // TODO: Rewrite this function such that multiple SingleRequests are started at once through a queue.

    for (const singleRequest of this.individualRequests) {
      singleRequest.collectAdditionals().then(() => singleRequest.doRequest())
    }

    for (const singleRequest of this.individualRequests) {
      await singleRequest.done.promise

      const result = singleRequest.resultingPanoIDs

      // outputResult(result)
    }
    return this.done.promise
  }
}
