import getPullRequestFiles from './getPullRequestFiles'
import getAnalyzedReport from './getAnalyzedReport'
import type {ESLintReport, AnalyzedESLintReport} from './types'
import constants from './constants'
const {GITHUB_WORKSPACE, OWNER, REPO, pullRequest, onlyChangedFiles} = constants

/**
 * Analyzes an ESLint report, separating pull request changed files
 * @param reportJS a JavaScript representation of an ESLint JSON report
 */
export default async function getPullRequestChangedAnalyzedReport(
  reportJS: ESLintReport,
): Promise<AnalyzedESLintReport> {
  const changedFiles = await getPullRequestFiles({
    owner: OWNER,
    repo: REPO,
    pull_number: pullRequest.number,
  })

  constants.core.info("changedFiles:");
  constants.core.info(JSON.stringify(changedFiles, null, 2));

  constants.core.info("report:");
  constants.core.info(JSON.stringify(reportJS, null, 2));

  // Separate lint reports for PR and non-PR files
  const pullRequestFilesReportJS: ESLintReport = reportJS.filter((file) => {
    constants.core.info("before");
    constants.core.info(file.filePath);

    file.filePath = file.filePath.replace(GITHUB_WORKSPACE + '/', '')

    constants.core.info("after");
    constants.core.info(file.filePath);

    return changedFiles.indexOf(file.filePath) !== -1
  })

  constants.core.info("changed file report:");
  constants.core.info(JSON.stringify(pullRequestFilesReportJS, null, 2));

  const analyzedPullRequestReport = getAnalyzedReport(pullRequestFilesReportJS)
  let summary = `${analyzedPullRequestReport.summary} in pull request changed files.`
  let markdown = `# Pull Request Changed Files ESLint Results:\n**${analyzedPullRequestReport.summary}**\n${analyzedPullRequestReport.markdown}`

  if (!onlyChangedFiles) {
    const nonPullRequestFilesReportJS: ESLintReport = reportJS.filter((file) => {
      file.filePath = file.filePath.replace(GITHUB_WORKSPACE + '/', '')
      return changedFiles.indexOf(file.filePath) === -1
    })

    const analyzedNonPullRequestReport = getAnalyzedReport(nonPullRequestFilesReportJS)

    summary += `${analyzedNonPullRequestReport.summary} in files outside of the pull request.`
    markdown += `\n\n# Non-Pull Request Changed Files ESLint Results:\n**${analyzedNonPullRequestReport.summary}**\n${analyzedNonPullRequestReport.markdown}`
  }

  if (markdown.length > 65535) {
    markdown = markdown.slice(0, 65250) + '\n\n...summary too long, truncated.'
  }

  return {
    errorCount: analyzedPullRequestReport.errorCount,
    warningCount: analyzedPullRequestReport.warningCount,
    markdown,
    success: analyzedPullRequestReport.success,
    summary,
    annotations: analyzedPullRequestReport.annotations,
  }
}
