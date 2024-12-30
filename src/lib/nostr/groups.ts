import { ndk } from '$lib/stores/ndk';
import NDK, { NDKEvent, NDKUser } from '@nostr-dev-kit/ndk';
import { SignerRequiredError, ValidationError, PublishError } from './errors';
import { 
  GROUP_METADATA,
  GROUP_CREATE,
  GROUP_EDIT_METADATA,
  GROUP_ADD_USER
} from './kinds';

export interface GroupContent {
  name: string;
  about?: string;
  picture?: string;
  isPrivate?: boolean;
  isClosed?: boolean;
}

function validateGroupContent(content: GroupContent): void {
  if (!content.name?.trim()) {
    throw new ValidationError('Group name is required');
  }
  if (content.name.length < 3) {
    throw new ValidationError('Group name must be at least 3 characters');
  }
  if (content.name.length > 100) {
    throw new ValidationError('Group name must be less than 100 characters');
  }
  
  if (content.picture) {
    try {
      new URL(content.picture);
    } catch {
      throw new ValidationError('Invalid picture URL');
    }
  }
}

export async function createGroup(
  ndk: NDK,
  content: GroupContent,
  identifier: string
): Promise<NDKEvent> {
  try {
    if (!ndk?.signer) {
      throw new SignerRequiredError();
    }

    // Validate content
    validateGroupContent(content);

    // Create group with kind:9007
    const createEvent = new NDKEvent(ndk);
    createEvent.kind = GROUP_CREATE;
    createEvent.tags = [
      ['h', identifier]
    ];
    await createEvent.publish();

    // Set metadata with kind:39000
    const metadataEvent = new NDKEvent(ndk);
    metadataEvent.kind = GROUP_METADATA;
    metadataEvent.tags = [
      ['d', identifier],
      ['name', content.name]
    ];

    if (content.about) metadataEvent.tags.push(['about', content.about]);
    if (content.picture) metadataEvent.tags.push(['picture', content.picture]);
    if (content.isPrivate) metadataEvent.tags.push(['private']);
    else metadataEvent.tags.push(['public']);
    if (content.isClosed) metadataEvent.tags.push(['closed']);
    else metadataEvent.tags.push(['open']);

    await metadataEvent.publish();

    // Add creator as admin
    const user = await ndk.signer.user();
    const addAdminEvent = new NDKEvent(ndk);
    addAdminEvent.kind = GROUP_ADD_USER;
    addAdminEvent.tags = [
      ['h', identifier],
      ['p', user.pubkey, 'admin']
    ];
    await addAdminEvent.publish();

    return metadataEvent;

  } catch (error) {
    console.error('Group creation error:', error);
    if (error instanceof ValidationError || error instanceof SignerRequiredError) {
      throw error;
    }
    throw new PublishError(`Failed to create group: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
