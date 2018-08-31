# Architecture Decision Record: Tracking stats from IBL feed

## Status
Pending

## Context
IBL have recently introduced stats into the episodes feed we get back from them. Each version in the feed has an `events` array, which contains a few entries detailing the `name` of the event, the `offset` (when it should fire) and the `system` of each event (uas / dax or optimizely), [see this example of an episodes feed](http://).

We have never used IBL data to determine when we fire events and when so this ADR is to propose approaches for doing so, as our current implementation hard codes these values.
