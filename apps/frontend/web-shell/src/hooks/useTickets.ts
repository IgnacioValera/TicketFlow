import { useCallback, useState } from 'react'
import * as ticketService from '@/services/ticket.service'
import type {
  AssignTicketPayload,
  ChangeTicketStatusPayload,
  CreateCommentPayload,
  CreateTicketPayload,
  EscalateTicketPayload,
  SubmitSurveyPayload,
  Ticket,
  TicketAttachment,
  TicketComment,
  TicketSlaStatus,
  TicketsListParams,
  UpdateTicketPayload,
} from '@/types/ticket.types'

export function useTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [comments, setComments] = useState<TicketComment[]>([])
  const [attachments, setAttachments] = useState<TicketAttachment[]>([])
  const [sla, setSla] = useState<TicketSlaStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadTickets = useCallback(async (params: TicketsListParams = {}) => {
    setLoading(true)
    setError('')
    try {
      const response = await ticketService.getTickets(params)
      setTickets(response.data)
      return response
    } catch (err: unknown) {
      const message = (err as { message?: string }).message || 'Error al cargar tickets'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const loadTicket = useCallback(async (id: string) => {
    setLoading(true)
    setError('')
    try {
      const data = await ticketService.getTicketById(id)
      setTicket(data)
      return data
    } catch (err: unknown) {
      const message = (err as { message?: string }).message || 'Error al cargar ticket'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const createTicket = useCallback(async (payload: CreateTicketPayload) => {
    setLoading(true)
    setError('')
    try {
      const data = await ticketService.createTicket(payload)
      setTicket(data)
      return data
    } catch (err: unknown) {
      const message = (err as { message?: string }).message || 'Error al crear ticket'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const updateTicket = useCallback(async (id: string, payload: UpdateTicketPayload) => {
    setLoading(true)
    setError('')
    try {
      const data = await ticketService.updateTicket(id, payload)
      setTicket(data)
      return data
    } catch (err: unknown) {
      const message = (err as { message?: string }).message || 'Error al actualizar ticket'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const changeStatus = useCallback(async (id: string, payload: ChangeTicketStatusPayload) => {
    const data = await ticketService.changeTicketStatus(id, payload)
    setTicket(data)
    return data
  }, [])

  const assignTicket = useCallback(async (id: string, payload: AssignTicketPayload) => {
    const data = await ticketService.assignTicket(id, payload)
    setTicket(data)
    return data
  }, [])

  const escalateTicket = useCallback(async (id: string, payload: EscalateTicketPayload) => {
    const data = await ticketService.escalateTicket(id, payload)
    setTicket(data)
    return data
  }, [])

  const closeTicket = useCallback(async (id: string) => {
    const data = await ticketService.closeTicket(id)
    setTicket(data)
    return data
  }, [])

  const loadComments = useCallback(async (ticketId: string) => {
    const data = await ticketService.getComments(ticketId)
    setComments(data)
    return data
  }, [])

  const addComment = useCallback(async (ticketId: string, payload: CreateCommentPayload) => {
    const data = await ticketService.addComment(ticketId, payload)
    setComments((prev) => [...prev, data])
    return data
  }, [])

  const loadAttachments = useCallback(async (ticketId: string) => {
    const data = await ticketService.getAttachments(ticketId)
    setAttachments(data)
    return data
  }, [])

  const uploadAttachment = useCallback(async (ticketId: string, file: File) => {
    const data = await ticketService.uploadAttachment(ticketId, file)
    setAttachments((prev) => [...prev, data])
    return data
  }, [])

  const removeAttachment = useCallback(async (id: string) => {
    await ticketService.deleteAttachment(id)
    setAttachments((prev) => prev.filter((a) => a.id !== id))
  }, [])

  const loadSla = useCallback(async (ticketId: string) => {
    const data = await ticketService.getTicketSla(ticketId)
    setSla(data)
    return data
  }, [])

  const submitSurvey = useCallback(async (ticketId: string, payload: SubmitSurveyPayload) => {
    const data = await ticketService.submitSurvey(ticketId, payload)
    setTicket((prev) => (prev ? { ...prev, survey: data } : prev))
    return data
  }, [])

  return {
    tickets,
    ticket,
    comments,
    attachments,
    sla,
    loading,
    error,
    setError,
    loadTickets,
    loadTicket,
    createTicket,
    updateTicket,
    changeStatus,
    assignTicket,
    escalateTicket,
    closeTicket,
    loadComments,
    addComment,
    loadAttachments,
    uploadAttachment,
    removeAttachment,
    loadSla,
    submitSurvey,
  }
}
