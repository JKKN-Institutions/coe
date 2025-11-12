import type { Institution, InstitutionFormData } from '@/types/institutions'

export async function fetchInstitutions(): Promise<Institution[]> {
  const response = await fetch('/api/institutions')
  if (!response.ok) {
    throw new Error('Failed to fetch institutions')
  }
  return response.json()
}

export async function createInstitution(data: InstitutionFormData): Promise<Institution> {
  const response = await fetch('/api/institutions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || 'Failed to create institution')
  }

  return response.json()
}

export async function updateInstitution(id: string, data: InstitutionFormData): Promise<Institution> {
  const response = await fetch('/api/institutions', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      id,
      ...data
    }),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || 'Failed to update institution')
  }

  return response.json()
}

export async function deleteInstitution(id: string): Promise<void> {
  const response = await fetch(`/api/institutions?id=${id}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || 'Failed to delete institution')
  }
}
