import {
  INTERACTION_PROFILES,
  type InteractionProfile,
  type InteractionProfileId
} from "@latex-suite/contracts";

/**
 * Returns the immutable interaction profile table entry for the given id.
 */
export function getInteractionProfile(id: InteractionProfileId): InteractionProfile {
  return INTERACTION_PROFILES[id];
}
