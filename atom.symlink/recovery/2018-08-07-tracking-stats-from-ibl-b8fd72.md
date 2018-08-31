# Architecture Decision Record: Tracking stats from IBL feed

## Accepted by
No one :(

## Context
IBL have recently introduced stats into the episodes feed we get back from them. Each version in the feed has an `events` array, which contains a few entries detailing the `name` of the event, the `offset` (when it should fire) and the `system` of each event (uas / dax or optimizely), [see this example of an episodes feed](https://ibl.api.bbci.co.uk/ibl/v1/episodes/p02gyz6b).

We have never used IBL data to determine when we fire events and when so this ADR is to propose approaches for doing so, as our current implementation hard codes these values.

## Evaluation criteria

The evaluation criteria will be what it works best and ease of implementation (time / complexity).

### Business

#### Audience
The proposed solutions will work for all our audience.

#### Legal/InfoSec
No special approval needed.

#### Licensing
No libraries are being used so no licensing necessary.

### Technical

#### Architecture/principles
Yes, it uses actions, reducers and the store to deal with the tracked events.

#### Ease of integration/migration
This is currently only relevant to the playback-v2 app but it integrates well into our existing stack given it leverages our existing technologies.

### Team
N/A

## Candidates to consider
* Non-queued 

## Research and analysis of each candidate
Research here

## Recommendation
Enter details of the recommendation here

### Prototype
Link to a working prototype
