class GetAllForOneRequest {
  constructor (id, params, service, latLngs, polygon) {
    this.id = id
    this.params = params
    this.streetViewService = service
    this.startingPoints = []
    this.startingPointPanos = new Set()
    this.startingPointsVisited = []
    this.startingPointsCollected = new Deferred()
    this.done = new Deferred()
    this.polygon = polygon

    this.panoIDQueue = []
    this.currentlyWorkingOn = new Set()
    this.visitedPanoIDs = new Set()

    this.resultingPanoIDs = new Set()

    this.radius = this.params.radius

    if (latLngs.length === 1) {
      this.center = latLngs
      return
    }

    if (latLngs[0] !== latLngs.slice(-1)) {
      latLngs.push(latLngs[0])
    }

    this.polygon = turf.polygon([latLngs])
    const centroid = turf.centroid(this.polygon)

    this.center = centroid.geometry.coordinates

    this.radius = Math.max(...latLngs.map((p) => getDistancebetweenLatLons(this.center[0], this.center[1], p[0], p[1])))
  }

  doLatLngRequest (latLngPoint) {
    const latLng = {
      lat: latLngPoint[0],
      lng: latLngPoint[1]
    }

    const request = {
      location: latLng,
      radius: this.params.requestRadius,
      source: google.maps.StreetViewSource.OUTDOOR
    }

    return this.streetViewService.getPanorama(request)
  }

  collectAdditionals () {
    // TODO: Center for polygon, radius for polygon mode as longest distance to vertex, discard starting points outside it

    const hexGrid = makeHexGrid(this.radius + this.params.requestRadius, this.params.requestRadius)
    // We add 1 request radius to the search radius because sample points are TWO request radii away from each other,
    // so a hex grid point just outside the search radius can still represent the only hexagon covering some area inside the search radius.

    this.startingPoints = hexGrid.map((point) => getLatLngFromStartAndXY(this.center[0], this.center[1], point[0], point[1]))
    // Convert the relative sample point grid (x,y) to actual lat,lng pairs using an aviation formula.

    for (const startingPoint of this.startingPoints) {
      this.doLatLngRequest(startingPoint).then((value) => {
        this.panoIDQueue.push(value.data.location.pano)
      }).catch(function (error) {
        if (error.code === 'ZERO_RESULTS') return
        console.log(error.code)
      }).finally(() => {
        this.startingPointsVisited.push(startingPoint)
        if (this.startingPointsVisited.length === this.startingPoints.length) this.startingPointsCollected.resolve()
      })
    }

    return this.startingPointsCollected.promise
  }

  isValidPano (location) {
    const lat = location.latLng.lat()
    const lng = location.latLng.lng()

    // console.log(getDistancebetweenLatLons(lat, lng, this.center[0], this.center[1]))

    if (this.polygon) return turf.booleanPointInPolygon([lat, lng], this.polygon)
    else return getDistancebetweenLatLons(lat, lng, this.center[0], this.center[1]) < this.radius
  }

  doSingleRequest (panoID) {
    const request = {
      pano: panoID
    }

    this.streetViewService.getPanorama(request).then((value) => {
      if (!this.isValidPano(value.data.location)) return

      this.resultingPanoIDs.add({ pano: panoID, lat: value.data.location.latLng.lat(), lng: value.data.location.latLng.lng() })

      for (const link of value.data.links) {
        if (this.visitedPanoIDs.has(link.pano)) continue

        this.panoIDQueue.push(link.pano)
      }
    }).catch(function (error) {
      console.log(error)
    }).finally(() => {
      this.currentlyWorkingOn.delete(panoID)
    })
  }

  async queueUpMore () {
    if (!this.currentlyWorkingOn.size && !this.panoIDQueue.length) {
      this.done.resolve()
      return
    }

    while (this.currentlyWorkingOn.size < 50 && this.panoIDQueue.length !== 0) {
      const nextPanoID = this.panoIDQueue.shift()
      this.currentlyWorkingOn.add(nextPanoID)
      this.visitedPanoIDs.add(nextPanoID)

      this.doSingleRequest(nextPanoID)
    }

    setTimeout(this.queueUpMore.bind(this), 10)
  }

  doRequest () {
    this.queueUpMore()

    return this.done.promise
  }
}
