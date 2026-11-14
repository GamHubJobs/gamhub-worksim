import { describe, expect, it } from 'vitest'
import { feedbackRequest } from './scenarioFeedback'

describe('coaching on a spoken answer', () => {
  it('sends the question, the answer and the points to cover, and asks for no mark', () => {
    const request = feedbackRequest({
      scenario: 'Hearing: Brightwater v Millstone',
      prompt: 'Your closing submission',
      answer: 'The mould was hidden.',
      mentions: [['hidden', 'not visible'], ['Harlow']],
      model: 'Judge, the flour was not of satisfactory quality…',
    })
    expect(request.text).toContain('I said: The mould was hidden.')
    expect(request.text).toContain('A strong answer covers: hidden; Harlow')
    expect(request.text).toContain('Do not give me a mark')
    expect(request.context.text).toContain('satisfactory quality')
  })
})
