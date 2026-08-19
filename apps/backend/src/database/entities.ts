import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

export enum RoleCode { ADMIN = 'ADMIN', SALES = 'SALES', SUPERVISOR = 'SUPERVISOR', AGENT = 'AGENT', CLIENT = 'CLIENT', REQUESTER = 'REQUESTER' }
export enum UserStatus { ACTIVE = 'ACTIVE', INACTIVE = 'INACTIVE', LOCKED = 'LOCKED' }
export enum CatalogStatus { ACTIVE = 'ACTIVE', INACTIVE = 'INACTIVE' }
export enum PriorityLevel { LOW = 'LOW', MEDIUM = 'MEDIUM', HIGH = 'HIGH', CRITICAL = 'CRITICAL' }
export enum CompanyTier { BRONZE = 'BRONZE', SILVER = 'SILVER', GOLD = 'GOLD', PLATINUM = 'PLATINUM' }
export enum ClientStatus { ACTIVE = 'ACTIVE', INACTIVE = 'INACTIVE', PROSPECT = 'PROSPECT' }
export enum ClientSegment { ENTERPRISE = 'ENTERPRISE', MID_MARKET = 'MID_MARKET', SMB = 'SMB' }
export enum TicketStatus { OPEN = 'OPEN', ASSIGNED = 'ASSIGNED', IN_PROGRESS = 'IN_PROGRESS', WAITING_USER = 'WAITING_USER', ESCALATED = 'ESCALATED', RESOLVED = 'RESOLVED', CLOSED = 'CLOSED', CANCELLED = 'CANCELLED' }
export enum OpportunityStage { NEW = 'NEW', QUALIFICATION = 'QUALIFICATION', PROPOSAL = 'PROPOSAL', NEGOTIATION = 'NEGOTIATION', WON = 'WON', LOST = 'LOST' }
export enum ActivityType { CALL = 'CALL', MEETING = 'MEETING', TASK = 'TASK', NOTE = 'NOTE' }
export enum ActivityStatus { PENDING = 'PENDING', COMPLETED = 'COMPLETED', CANCELLED = 'CANCELLED' }
export enum SurveyStatus { DRAFT = 'DRAFT', PUBLISHED = 'PUBLISHED', CLOSED = 'CLOSED' }
export enum SurveyTrigger { MANUAL = 'MANUAL', OPPORTUNITY_WON = 'OPPORTUNITY_WON' }
export enum SurveyQuestionType { TEXT = 'TEXT', SINGLE_CHOICE = 'SINGLE_CHOICE', MULTIPLE_CHOICE = 'MULTIPLE_CHOICE', NPS = 'NPS', RATING = 'RATING', YES_NO = 'YES_NO' }

@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn('uuid') id: string
  @Index({ unique: true }) @Column({ length: 80 }) code: string
  @Column({ length: 120 }) name: string
}

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn('uuid') id: string
  @Index({ unique: true }) @Column({ type: 'enum', enum: RoleCode }) code: RoleCode
  @Column({ length: 80 }) name: string
  @ManyToMany(() => Permission, { eager: true })
  @JoinTable({ name: 'role_permissions', joinColumn: { name: 'role_id' }, inverseJoinColumn: { name: 'permission_id' } })
  permissions: Permission[]
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid') id: string
  @Column({ name: 'full_name', length: 160 }) fullName: string
  @Index({ unique: true }) @Column({ length: 200 }) email: string
  @Column({ name: 'password_hash', select: false }) passwordHash: string
  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.ACTIVE }) status: UserStatus
  @Column({ name: 'must_change_password', default: false }) mustChangePassword: boolean
  @ManyToOne(() => Role, { eager: true, nullable: false }) @JoinColumn({ name: 'role_id' }) role: Role
  @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true }) lastLoginAt: Date | null
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date
}

@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid') id: string
  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: false }) @JoinColumn({ name: 'user_id' }) user: User
  @Index({ unique: true }) @Column({ name: 'token_hash', length: 64 }) tokenHash: string
  @Column({ name: 'expires_at', type: 'timestamptz' }) expiresAt: Date
  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true }) revokedAt: Date | null
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date
}

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn('uuid') id: string
  @Index({ unique: true }) @Column({ length: 120 }) name: string
  @Column({ type: 'text', default: '' }) description: string
  @Column({ type: 'enum', enum: CatalogStatus, default: CatalogStatus.ACTIVE }) status: CatalogStatus
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date
}

@Entity('priorities')
export class Priority {
  @PrimaryGeneratedColumn('uuid') id: string
  @Index({ unique: true }) @Column({ length: 80 }) name: string
  @Column({ type: 'enum', enum: PriorityLevel }) level: PriorityLevel
  @Column({ length: 20, default: '#247b7b' }) color: string
  @Column({ type: 'text', default: '' }) description: string
  @Column({ type: 'enum', enum: CatalogStatus, default: CatalogStatus.ACTIVE }) status: CatalogStatus
}

@Entity('sla_policies')
export class SlaPolicy {
  @PrimaryGeneratedColumn('uuid') id: string
  @Index({ unique: true }) @Column({ length: 120 }) name: string
  @OneToOne(() => Priority, { eager: true, nullable: false }) @JoinColumn({ name: 'priority_id' }) priority: Priority
  @Column({ name: 'response_hours', type: 'int' }) responseHours: number
  @Column({ name: 'resolution_hours', type: 'int' }) resolutionHours: number
  @Column({ type: 'enum', enum: CatalogStatus, default: CatalogStatus.ACTIVE }) status: CatalogStatus
}

@Entity('clients')
export class Client {
  @PrimaryGeneratedColumn('uuid') id: string
  @Index({ unique: true }) @Column({ length: 160 }) name: string
  @Column({ length: 100, default: '' }) industry: string
  @Column({ length: 100, default: '' }) region: string
  @Column({ type: 'enum', enum: CompanyTier, default: CompanyTier.BRONZE }) tier: CompanyTier
  @Column({ length: 200, default: '' }) email: string
  @Column({ length: 40, default: '' }) phone: string
  @Column({ type: 'enum', enum: ClientStatus, enumName: 'client_status_enum', default: ClientStatus.ACTIVE }) status: ClientStatus
  @Column({ type: 'enum', enum: ClientSegment, enumName: 'client_segment_enum', default: ClientSegment.SMB }) segment: ClientSegment
  @ManyToOne(() => User, { nullable: true }) @JoinColumn({ name: 'owner_id' }) owner: User | null
  @Column({ type: 'int', default: 50 }) score: number
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date
}

@Entity('ticket_counters')
export class TicketCounter {
  @PrimaryGeneratedColumn('uuid') id: string
  @Index({ unique: true }) @Column({ type: 'int' }) year: number
  @Column({ type: 'int', default: 0 }) value: number
}

@Entity('tickets')
@Index(['status', 'createdAt'])
export class Ticket {
  @PrimaryGeneratedColumn('uuid') id: string
  @Index({ unique: true }) @Column({ length: 30 }) folio: string
  @Column({ length: 200 }) title: string
  @Column({ type: 'text' }) description: string
  @Column({ type: 'enum', enum: TicketStatus, default: TicketStatus.OPEN }) status: TicketStatus
  @ManyToOne(() => Category, { eager: true, nullable: false }) @JoinColumn({ name: 'category_id' }) category: Category
  @ManyToOne(() => Priority, { eager: true, nullable: false }) @JoinColumn({ name: 'priority_id' }) priority: Priority
  @ManyToOne(() => User, { eager: true, nullable: false }) @JoinColumn({ name: 'requester_id' }) requester: User
  @ManyToOne(() => User, { eager: true, nullable: true }) @JoinColumn({ name: 'assignee_id' }) assignee: User | null
  @ManyToOne(() => Client, { eager: true, nullable: true }) @JoinColumn({ name: 'client_id' }) client: Client | null
  @Column({ name: 'sla_created_at', type: 'timestamptz' }) slaCreatedAt: Date
  @Column({ name: 'sla_due_at', type: 'timestamptz' }) slaDueAt: Date
  @Column({ name: 'resolution_hours', type: 'int' }) resolutionHours: number
  @Column({ name: 'closed_at', type: 'timestamptz', nullable: true }) closedAt: Date | null
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date
  @OneToMany(() => TicketComment, (comment) => comment.ticket) comments: TicketComment[]
  @OneToMany(() => TicketAttachment, (attachment) => attachment.ticket) attachments: TicketAttachment[]
  @OneToMany(() => TicketHistory, (history) => history.ticket) histories: TicketHistory[]
  @OneToOne(() => SatisfactionSurvey, (survey) => survey.ticket) survey: SatisfactionSurvey | null
}

@Entity('ticket_comments')
export class TicketComment {
  @PrimaryGeneratedColumn('uuid') id: string
  @ManyToOne(() => Ticket, (ticket) => ticket.comments, { onDelete: 'CASCADE', nullable: false }) @JoinColumn({ name: 'ticket_id' }) ticket: Ticket
  @ManyToOne(() => User, { eager: true, nullable: false }) @JoinColumn({ name: 'author_id' }) author: User
  @Column({ type: 'text' }) body: string
  @Column({ name: 'is_internal', default: false }) isInternal: boolean
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date
}

@Entity('ticket_attachments')
export class TicketAttachment {
  @PrimaryGeneratedColumn('uuid') id: string
  @ManyToOne(() => Ticket, (ticket) => ticket.attachments, { onDelete: 'CASCADE', nullable: false }) @JoinColumn({ name: 'ticket_id' }) ticket: Ticket
  @ManyToOne(() => User, { eager: true, nullable: false }) @JoinColumn({ name: 'uploaded_by' }) uploader: User
  @Column({ name: 'file_name', length: 255 }) fileName: string
  @Column({ name: 'stored_name', length: 255 }) storedName: string
  @Column({ name: 'mime_type', length: 150 }) mimeType: string
  @Column({ name: 'size_bytes', type: 'int' }) sizeBytes: number
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date
}

@Entity('ticket_history')
export class TicketHistory {
  @PrimaryGeneratedColumn('uuid') id: string
  @ManyToOne(() => Ticket, (ticket) => ticket.histories, { onDelete: 'CASCADE', nullable: false }) @JoinColumn({ name: 'ticket_id' }) ticket: Ticket
  @ManyToOne(() => User, { eager: true, nullable: false }) @JoinColumn({ name: 'changed_by' }) changedBy: User
  @Column({ name: 'event_type', length: 40, default: 'STATUS_CHANGED' }) eventType: string
  @Column({ name: 'old_status', type: 'enum', enum: TicketStatus, nullable: true }) oldStatus: TicketStatus | null
  @Column({ name: 'new_status', type: 'enum', enum: TicketStatus }) newStatus: TicketStatus
  @Column({ type: 'text', nullable: true }) reason: string | null
  @Column({ type: 'jsonb', nullable: true }) details: Record<string, unknown> | null
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date
}

@Entity('satisfaction_surveys')
export class SatisfactionSurvey {
  @PrimaryGeneratedColumn('uuid') id: string
  @OneToOne(() => Ticket, (ticket) => ticket.survey, { onDelete: 'CASCADE', nullable: false }) @JoinColumn({ name: 'ticket_id' }) ticket: Ticket
  @ManyToOne(() => User, { nullable: false }) @JoinColumn({ name: 'submitted_by' }) submittedBy: User
  @Column({ type: 'smallint' }) rating: number
  @Column({ type: 'text', nullable: true }) comment: string | null
  @CreateDateColumn({ name: 'submitted_at', type: 'timestamptz' }) submittedAt: Date
}

@Entity('knowledge_articles')
export class KnowledgeArticle {
  @PrimaryGeneratedColumn('uuid') id: string
  @Column({ length: 200 }) title: string
  @Column({ type: 'text' }) content: string
  @Column({ length: 220, default: '' }) tags: string
  @Column({ type: 'enum', enum: CatalogStatus, default: CatalogStatus.ACTIVE }) status: CatalogStatus
  @ManyToOne(() => Category, { eager: true, nullable: true }) @JoinColumn({ name: 'category_id' }) category: Category | null
  @ManyToOne(() => User, { eager: true, nullable: false }) @JoinColumn({ name: 'author_id' }) author: User
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date
}

@Entity('crm_contacts')
export class CrmContact {
  @PrimaryGeneratedColumn('uuid') id: string
  @ManyToOne(() => Client, { nullable: false, onDelete: 'CASCADE' }) @JoinColumn({ name: 'client_id' }) client: Client
  @Column({ name: 'first_name', length: 80 }) firstName: string
  @Column({ name: 'last_name', length: 80 }) lastName: string
  @Column({ length: 200 }) email: string
  @Column({ length: 40, default: '' }) phone: string
  @Column({ name: 'job_title', length: 120, default: '' }) jobTitle: string
  @Column({ name: 'is_primary', default: false }) isPrimary: boolean
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date
}

@Entity('crm_opportunities')
export class CrmOpportunity {
  @PrimaryGeneratedColumn('uuid') id: string
  @ManyToOne(() => Client, { nullable: false, onDelete: 'CASCADE' }) @JoinColumn({ name: 'client_id' }) client: Client
  @ManyToOne(() => CrmContact, { nullable: true, onDelete: 'SET NULL' }) @JoinColumn({ name: 'contact_id' }) contact: CrmContact | null
  @ManyToOne(() => User, { nullable: true }) @JoinColumn({ name: 'owner_id' }) owner: User | null
  @Column({ length: 200 }) title: string
  @Column({ type: 'double precision', default: 0 }) amount: number
  @Column({ length: 3, default: 'MXN' }) currency: string
  @Column({ type: 'int', default: 10 }) probability: number
  @Column({ type: 'enum', enum: OpportunityStage, enumName: 'opportunity_stage_enum', default: OpportunityStage.NEW }) stage: OpportunityStage
  @Column({ name: 'expected_close_date', type: 'date', nullable: true }) expectedCloseDate: string | null
  @Column({ name: 'lost_reason', type: 'text', nullable: true }) lostReason: string | null
  @Column({ type: 'text', default: '' }) notes: string
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date
  @OneToMany(() => CrmOpportunityStageHistory, (history) => history.opportunity) stageHistory: CrmOpportunityStageHistory[]
}

@Entity('crm_opportunity_stage_history')
export class CrmOpportunityStageHistory {
  @PrimaryGeneratedColumn('uuid') id: string
  @ManyToOne(() => CrmOpportunity, (opportunity) => opportunity.stageHistory, { onDelete: 'CASCADE', nullable: false }) @JoinColumn({ name: 'opportunity_id' }) opportunity: CrmOpportunity
  @ManyToOne(() => User, { nullable: false }) @JoinColumn({ name: 'changed_by' }) changedBy: User
  @Column({ name: 'old_stage', type: 'enum', enum: OpportunityStage, enumName: 'opportunity_stage_enum', nullable: true }) oldStage: OpportunityStage | null
  @Column({ name: 'new_stage', type: 'enum', enum: OpportunityStage, enumName: 'opportunity_stage_enum' }) newStage: OpportunityStage
  @Column({ type: 'text', nullable: true }) reason: string | null
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date
}

@Entity('crm_activities')
export class CrmActivity {
  @PrimaryGeneratedColumn('uuid') id: string
  @ManyToOne(() => Client, { nullable: false, onDelete: 'CASCADE' }) @JoinColumn({ name: 'client_id' }) client: Client
  @ManyToOne(() => CrmOpportunity, { nullable: true, onDelete: 'SET NULL' }) @JoinColumn({ name: 'opportunity_id' }) opportunity: CrmOpportunity | null
  @ManyToOne(() => CrmContact, { nullable: true, onDelete: 'SET NULL' }) @JoinColumn({ name: 'contact_id' }) contact: CrmContact | null
  @ManyToOne(() => User, { nullable: true }) @JoinColumn({ name: 'owner_id' }) owner: User | null
  @Column({ type: 'enum', enum: ActivityType, enumName: 'crm_activity_type_enum' }) type: ActivityType
  @Column({ type: 'enum', enum: ActivityStatus, enumName: 'crm_activity_status_enum', default: ActivityStatus.PENDING }) status: ActivityStatus
  @Column({ length: 200 }) subject: string
  @Column({ type: 'text', default: '' }) body: string
  @Column({ name: 'due_at', type: 'timestamptz', nullable: true }) dueAt: Date | null
  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true }) completedAt: Date | null
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date
}

@Entity('crm_surveys')
export class CrmSurvey {
  @PrimaryGeneratedColumn('uuid') id: string
  @Column({ length: 200 }) title: string
  @Column({ type: 'text', default: '' }) description: string
  @Column({ type: 'enum', enum: SurveyStatus, enumName: 'crm_survey_status_enum', default: SurveyStatus.DRAFT }) status: SurveyStatus
  @Column({ type: 'enum', enum: SurveyTrigger, enumName: 'crm_survey_trigger_enum', default: SurveyTrigger.MANUAL }) trigger: SurveyTrigger
  @ManyToOne(() => User, { nullable: false }) @JoinColumn({ name: 'created_by' }) createdBy: User
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date
  @OneToMany(() => CrmSurveyQuestion, (question) => question.survey) questions: CrmSurveyQuestion[]
}

@Entity('crm_survey_questions')
export class CrmSurveyQuestion {
  @PrimaryGeneratedColumn('uuid') id: string
  @ManyToOne(() => CrmSurvey, (survey) => survey.questions, { onDelete: 'CASCADE', nullable: false }) @JoinColumn({ name: 'survey_id' }) survey: CrmSurvey
  @Column({ type: 'text' }) prompt: string
  @Column({ type: 'enum', enum: SurveyQuestionType, enumName: 'crm_question_type_enum' }) type: SurveyQuestionType
  @Column({ default: true }) required: boolean
  @Column({ type: 'int', default: 0 }) position: number
  @OneToMany(() => CrmSurveyQuestionOption, (option) => option.question) options: CrmSurveyQuestionOption[]
}

@Entity('crm_survey_question_options')
export class CrmSurveyQuestionOption {
  @PrimaryGeneratedColumn('uuid') id: string
  @ManyToOne(() => CrmSurveyQuestion, (question) => question.options, { onDelete: 'CASCADE', nullable: false }) @JoinColumn({ name: 'question_id' }) question: CrmSurveyQuestion
  @Column({ length: 200 }) label: string
  @Column({ length: 80, default: '' }) value: string
  @Column({ type: 'int', default: 0 }) position: number
}

@Entity('crm_survey_invitations')
export class CrmSurveyInvitation {
  @PrimaryGeneratedColumn('uuid') id: string
  @ManyToOne(() => CrmSurvey, { nullable: false, onDelete: 'CASCADE' }) @JoinColumn({ name: 'survey_id' }) survey: CrmSurvey
  @ManyToOne(() => CrmOpportunity, { nullable: true, onDelete: 'CASCADE' }) @JoinColumn({ name: 'opportunity_id' }) opportunity: CrmOpportunity | null
  @ManyToOne(() => CrmContact, { nullable: true, onDelete: 'SET NULL' }) @JoinColumn({ name: 'contact_id' }) contact: CrmContact | null
  @ManyToOne(() => Client, { nullable: true, onDelete: 'CASCADE' }) @JoinColumn({ name: 'client_id' }) client: Client | null
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' }) @JoinColumn({ name: 'created_by' }) createdBy: User | null
  @Column({ type: 'enum', enum: SurveyTrigger, enumName: 'crm_survey_trigger_enum', default: SurveyTrigger.MANUAL }) trigger: SurveyTrigger
  @Index({ unique: true }) @Column({ name: 'token_hash', length: 64 }) tokenHash: string
  @Column({ name: 'expires_at', type: 'timestamptz' }) expiresAt: Date
  @Column({ name: 'used_at', type: 'timestamptz', nullable: true }) usedAt: Date | null
  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true }) revokedAt: Date | null
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date
}

@Entity('crm_survey_responses')
export class CrmSurveyResponse {
  @PrimaryGeneratedColumn('uuid') id: string
  @OneToOne(() => CrmSurveyInvitation, { nullable: false, onDelete: 'CASCADE' }) @JoinColumn({ name: 'invitation_id' }) invitation: CrmSurveyInvitation
  @ManyToOne(() => CrmSurvey, { nullable: false, onDelete: 'CASCADE' }) @JoinColumn({ name: 'survey_id' }) survey: CrmSurvey
  @Column({ name: 'nps_score', type: 'smallint', nullable: true }) npsScore: number | null
  @CreateDateColumn({ name: 'submitted_at', type: 'timestamptz' }) submittedAt: Date
  @OneToMany(() => CrmSurveyAnswer, (answer) => answer.response) answers: CrmSurveyAnswer[]
}

@Entity('crm_survey_answers')
export class CrmSurveyAnswer {
  @PrimaryGeneratedColumn('uuid') id: string
  @ManyToOne(() => CrmSurveyResponse, (response) => response.answers, { onDelete: 'CASCADE', nullable: false }) @JoinColumn({ name: 'response_id' }) response: CrmSurveyResponse
  @ManyToOne(() => CrmSurveyQuestion, { nullable: false, onDelete: 'CASCADE' }) @JoinColumn({ name: 'question_id' }) question: CrmSurveyQuestion
  @Column({ name: 'text_value', type: 'text', nullable: true }) textValue: string | null
  @Column({ name: 'number_value', type: 'smallint', nullable: true }) numberValue: number | null
  @Column({ name: 'option_ids', type: 'jsonb', nullable: true }) optionIds: string[] | null
}

export const ENTITIES = [
  Permission, Role, User, RefreshToken, Category, Priority, SlaPolicy, Client, TicketCounter, Ticket,
  TicketComment, TicketAttachment, TicketHistory, SatisfactionSurvey, KnowledgeArticle,
  CrmContact, CrmOpportunity, CrmOpportunityStageHistory, CrmActivity, CrmSurvey, CrmSurveyQuestion,
  CrmSurveyQuestionOption, CrmSurveyInvitation, CrmSurveyResponse, CrmSurveyAnswer,
]
