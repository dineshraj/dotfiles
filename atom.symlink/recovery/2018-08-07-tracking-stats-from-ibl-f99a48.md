# Architecture Decision Record: Tracking stats from IBL feed

## Status
Pending

## Context
IBL have recently introduced stats into the episodes feed we get back from them. Each version in the feed has an `events` array, which contains a few entries detailing the `name` of the event, the `offset` (when it should fire) and the `system` of each event (uas / dax or optimizely).

We have never 
