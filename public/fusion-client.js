/**
 * FUSION framework-free browser client.
 *
 * For host applications that are not React — plain HTML, Vue, Svelte, Django
 * templates, anything. Drop in one script tag and duplicate reports collapse
 * into single corroborated incidents.
 *
 * @example
 * <script src="http://localhost:4104/fusion-client.js"></script>
 * <script>
 *   const fusion = Fusion.connect({
 *     baseUrl: 'http://localhost:4104',
 *     onIncident: (e) => console.log(e.isNew ? 'new' : 'corroborated', e.incident.id),
 *     onQuarantine: (e) => console.warn('held for review:', e.reasons),
 *   })
 *
 *   fusion.submit({
 *     text: 'Smoke near the library',
 *     lat: 20.3536, lng: 85.8195,
 *     category: 'fire', reporterToken: 'student-4471',
 *   }).then((r) => console.log(r.corroborationCount, r.confidence))
 *   // fusion.disconnect()
 * </script>
 */
(function (global) {
  'use strict'

  function connect(options) {
    if (!options || !options.baseUrl) {
      throw new Error('Fusion.connect requires a baseUrl')
    }

    var baseUrl = options.baseUrl.replace(/\/$/, '')
    var source = new EventSource(baseUrl + '/api/events')

    function forward(eventName, handlerName) {
      source.addEventListener(eventName, function (event) {
        if (typeof options[handlerName] === 'function') {
          options[handlerName](JSON.parse(event.data))
        }
      })
    }

    // A new incident and a corroboration of an existing one are the same
    // event to most callers, so both reach onIncident; `isNew` distinguishes
    // them for callers that care.
    forward('incident.created', 'onIncident')
    forward('incident.updated', 'onIncident')
    forward('report.quarantined', 'onQuarantine')

    source.onopen = function () {
      if (typeof options.onStatusChange === 'function') options.onStatusChange('live')
    }

    source.onerror = function () {
      // EventSource reconnects on its own; this is informational only.
      if (typeof options.onStatusChange === 'function') options.onStatusChange('reconnecting')
    }

    function asJson(response) {
      // 200, 201 and 202 are all meaningful successes here: corroborated an
      // existing incident, founded a new one, or quarantined for review.
      if (!response.ok) throw new Error('FUSION request failed with ' + response.status)
      return response.json()
    }

    /**
     * Submits one report through the full pipeline — quarantine, clustering,
     * confidence, velocity. Resolves with the incident it landed on, that
     * incident's corroboration count and confidence, and whether it was new.
     */
    function submit(report) {
      return fetch(baseUrl + '/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report),
      }).then(asJson)
    }

    /** Fused incidents, optionally filtered by status. */
    function incidents(status) {
      return fetch(baseUrl + '/api/incidents' + (status ? '?status=' + status : '')).then(asJson)
    }

    /** The individual reports that were fused into one incident. */
    function reportsFor(incidentId) {
      return fetch(baseUrl + '/api/incidents/' + encodeURIComponent(incidentId)).then(asJson)
    }

    /**
     * The review lane: reports quarantined as suspected-false, each carrying
     * the human-readable reasons it was held rather than dispatched.
     */
    function flags() {
      return fetch(baseUrl + '/api/flags').then(asJson)
    }

    return {
      submit: submit,
      incidents: incidents,
      reportsFor: reportsFor,
      flags: flags,
      disconnect: function () {
        source.close()
      },
    }
  }

  global.Fusion = { connect: connect }
})(window)
