class Deferred {
  constructor () {
    const self = this
    this.promise = new Promise(function (resolve, reject) {
      self.reject = reject
      self.resolve = resolve
    })
  }
}

function makeHexGrid (radius, distance) {
  const points = []

  for (let n = 0; true; n++) {
    const x = n * distance * Math.sqrt(3) / 2
    if (x > radius) return points

    for (let m = 0; true; m++) {
      const y = (m + (n % 2) / 2) * distance * 3

      if (Math.sqrt(x ** 2 + y ** 2) > radius) break

      points.push([x, y])
      if (x !== 0) points.push([-x, y])
      if (y !== 0) points.push([x, -y])
      if (x !== 0 && y !== 0) points.push([-x, -y])
    }
  }
}

// http://www.edwilliams.org/avform147.htm#LL
function avformRadialAndDistance (lat1, lng1, d, tc) {
  const lat = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lng1) * Math.sin(d) * Math.cos(tc))

  let lng = lng1
  if (Math.cos(lat) !== 0) lng = ((lng1 - Math.asin(Math.sin(tc) * Math.sin(d) / Math.cos(lat)) + Math.PI) % (2 * Math.PI)) - Math.PI

  return [lat, lng]
}

function getLatLngFromStartAndXY (lat, lng, x, y) {
  const earthRadius = 6366710

  const metersDistance = Math.sqrt(x ** 2 + y ** 2)
  const radialDistance = metersDistance / earthRadius

  const angle = Math.atan2(y, x)
  const trueCourse = -(angle - Math.PI / 2)

  return avformRadialAndDistance(lat * Math.PI / 180, lng * Math.PI / 180, radialDistance, trueCourse).map((value) => value * 180 / Math.PI)
}

function getDistancebetweenLatLons (lat1, lon1, lat2, lon2) {
  const latLng1 = new google.maps.LatLng(lat1, lon1)
  const latLng2 = new google.maps.LatLng(lat2, lon2)

  return google.maps.geometry.spherical.computeDistanceBetween(latLng1, latLng2)
}

function outputResult (result) {
  let str = ''

  for (const pano of result) {
    str += pano.lat
    str += ','
    str += pano.lng
    str += ',\n'
  }

  console.log(str)
}
