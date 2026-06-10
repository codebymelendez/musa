import { useMutation, useQueryClient } from '@tanstack/react-query'
import { inviteTeamMember } from '../../lib/api'
import { keys } from './keys'

export function useInviteTeamMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (email: string) => inviteTeamMember(email),
    // Team members and invitations travel inside the settings payload.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.settings })
    },
  })
}
