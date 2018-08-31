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

### Technical

#### Architecture/principles
Yes, it uses actions, reducers and the store to deal with the tracked events.

#### Ease of integration/migration
This is currently only relevant to the playback-v2 app but it integrates well into our existing stack given it leverages our existing technologies.

## Candidates to consider
* [Non-queued implementation](https://jira.dev.bbc.co.uk/browse/IPLAYER-34139)
* [Queued implementation](https://jira.dev.bbc.co.uk/browse/IPLAYER-34138)

## Research and analysis of each candidate

### Non-queued Implementation
This implementation calls a method on the custom event listener in the `player` component every time we get a `significanttimeupdate` from SMP, to which we pass through the current version and the current time.

This method 



### Queued implementation
[See this link](https://avatars2.githubusercontent.com/u/8641838?s=400&v=4)

## Recommendation
Enter details of the recommendation here

### Prototype
* [Non-queued implementation](https://github.com/bbc/iplayer-web-app-playback-v2/tree/34139-stats-reducer-spike)
* [Queued implementation](https://pbs.twimg.com/profile_images/378800000767729213/d012e0c216d13ddb2cc3a1565dcec60e_400x400.jpeg)
