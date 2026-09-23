export async function shareScore(score: number): Promise<'shared' | 'copied'> {
  const text = `I scored ${score} points in Stack Tower. Can you beat me?`;
  if (navigator.share) {
    await navigator.share({ title: 'Stack Tower', text, url: window.location.href });
    return 'shared';
  }
  await navigator.clipboard.writeText(`${text} ${window.location.href}`);
  return 'copied';
}
