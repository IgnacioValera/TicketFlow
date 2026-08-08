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

export enum RoleCode { ADMIN = 'ADMIN', SUPERVISOR = 'SUPERVISOR', AGENT = 'AGENT', REQUESTER = 'REQUESTER' }
export enum UserStatus { ACTIVE = 'ACTIVE', INACTIVE = 'INACTIVE', LOCKED = 'LOCKED' }
export enum CatalogStatus { ACTIVE = 'ACTIVE', INACTIVE = 'INACTIVE' }
export enum PriorityLevel { LOW = 'LOW', MEDIUM = 'MEDIUM', HIGH = 'HIGH', CRITICAL = 'CRITICAL' }
export enum CompanyTier { BRONZE = 'BRONZE', SILVER = 'SILVER', GOLD = 'GOLD', PLATINUM = 'PLATINUM' }
export enum TicketStatus { OPEN = 'OPEN', ASSIGNED = 'ASSIGNED', IN_PROGRESS = 'IN_PROGRESS', WAITING_USER = 'WAITING_USER', ESCALATED = 'ESCALATED', RESOLVED = 'RESOLVED', CLOSED = 'CLOSED', CANCELLED = 'CANCELLED' }

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
  @Index({ unique: true }) @Column({ type: 'enum', enum: PriorityLevel }) level: PriorityLevel
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

@Entity('companies')
export class Company {
  @PrimaryGeneratedColumn('uuid') id: string
  @Index({ unique: true }) @Column({ length: 160 }) name: string
  @Column({ length: 100, default: '' }) industry: string
  @Column({ length: 100, default: '' }) region: string
  @Column({ type: 'enum', enum: CompanyTier, default: CompanyTier.BRONZE }) tier: CompanyTier
  @Column({ name: 'contact_email', length: 200, default: '' }) contactEmail: string
  @Column({ name: 'contact_phone', length: 40, default: '' }) contactPhone: string
  @Column({ type: 'enum', enum: CatalogStatus, default: CatalogStatus.ACTIVE }) status: CatalogStatus
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
  @ManyToOne(() => Company, { eager: true, nullable: true }) @JoinColumn({ name: 'company_id' }) company: Company | null
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

export const ENTITIES = [Permission, Role, User, RefreshToken, Category, Priority, SlaPolicy, Company, TicketCounter, Ticket, TicketComment, TicketAttachment, TicketHistory, SatisfactionSurvey, KnowledgeArticle]
