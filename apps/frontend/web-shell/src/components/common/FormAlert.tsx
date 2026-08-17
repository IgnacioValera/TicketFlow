interface FormAlertProps {
  title?: string
  messages: string[]
}

export function FormAlert({ title, messages }: FormAlertProps) {
  if (!messages.length) return null
  return (
    <div role="alert" className="rounded border border-danger/30 bg-red-50 px-3 py-2 text-sm text-danger">
      {title && <p className="font-semibold">{title}</p>}
      {messages.length === 1 ? (
        <p className={title ? 'mt-1' : ''}>{messages[0]}</p>
      ) : (
        <ul className={`list-disc space-y-0.5 pl-4 ${title ? 'mt-1' : ''}`}>
          {messages.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
