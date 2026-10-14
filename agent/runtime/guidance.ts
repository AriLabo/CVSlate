import { ResumeError } from '../../src/core/errors';
export type OperationCategory = 'read' | 'write' | 'export';
export function errorResult(error: unknown, category: OperationCategory) {
  const safe = error instanceof ResumeError ? error : new ResumeError('STORAGE_FAILED', '无法连接工作区或完成操作；请检查本地运行环境');
  let nextAction: string;
  switch (safe.code) {
    case 'REVISION_CONFLICT': nextAction = 'get_resume 重新读取最新 revision，并根据最新内容重新计算 patch'; break;
    case 'SNAPSHOT_UNAVAILABLE': nextAction = '重新读取并检查可用 revision；不要导出未检查的其他版本'; break;
    case 'WORKSPACE_LOCKED': nextAction = '检查已有 Bridge；不要启动第二个写者。异常退出后先按恢复文档检查锁'; break;
    case 'UNAUTHORIZED': nextAction = '执行 cvslate stop 后重试；不手改 token'; break;
    case 'VALIDATION_FAILED': nextAction = category === 'export' ? '检查 PDF 文件名、输出目录和已存在文件，选择合法的新文件名' : '根据 Schema、themes 或具体错误修正输入；保持真实经历'; break;
    case 'PRIVACY_MODE': nextAction = '隐私模式下这一步含真实个人信息，请用户在网页里完成（批准导出、备份、填写隐私信息或关闭隐私模式）；不要尝试绕过'; break;
    case 'EXPORT_PENDING': nextAction = '已有导出请求在等用户处理；等它结束（最多 5 分钟）再请求，不要重复发起'; break;
    case 'EXPORT_DECLINED': nextAction = '用户拒绝了导出或没有处理。不要自动重试，也不要自己操作网页批准；问用户是否还要导出、要不要先改内容，改完重新 inspect 再请求'; break;
    case 'BRIDGE_NOT_RUNNING': nextAction = '请求发出前 Bridge 已退出，什么都没写入；直接重试，命令会重新启动 Bridge'; break;
    case 'RENDER_TIMEOUT': nextAction = '执行 cvslate doctor；缺 Chromium 时执行 cvslate setup，再 inspect 同一 revision'; break;
    default: nextAction = category === 'write' ? '执行 cvslate doctor 检查运行环境和 Bridge；写入结果未知时先用 get 或 tree 确认，没写入再用原 mutationId 和完全相同参数重试' : category === 'export' ? '执行 cvslate doctor；缺 Chromium 时执行 cvslate setup。检查文件名、输出环境并 inspect 同一 revision 后重试导出' : '执行 cvslate doctor 检查运行环境和 Bridge 后重试读取';
  }
  return { code: safe.code, message: safe.message, nextAction, ...(safe.currentRevision === undefined ? {} : { currentRevision: safe.currentRevision }) };
}
