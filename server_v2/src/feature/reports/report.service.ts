/**
 * Report Service
 * 
 * Business logic for report generation and management:
 * - PDF generation with jsPDF
 * - GridFS file storage
 * - Report listing and filtering
 * - Automatic cleanup of expired reports
 * 
 * @module feature/reports/report.service
 */

import Report from './report.model';
import {
  IReportDocument,
  ICreateReportData,
  IReportFilters,
  IReportStatistics,
  ReportStatus,
  ReportType,
  ReportFormat,
} from './report.types';
import { CRUDOperations } from '@utils/queryBuilder.util';
import { NotFoundError, BadRequestError } from '@utils/errors.util';
import { ERROR_MESSAGES } from '@core/configs/messages.config';
import { Types, Document } from 'mongoose';

/**
 * Report Service Class
 * Handles report generation and storage
 * 
 * NOTE: PDF/GridFS services will be integrated once created
 */
export class ReportService {
  private crud: CRUDOperations<IReportDocument & Document>;

  constructor() {
    this.crud = new CRUDOperations<IReportDocument & Document>(Report as any);
  }

  /**
   * Create report request
   * Initiates report generation process
   */
  async createReport(reportData: ICreateReportData): Promise<IReportDocument> {
    // Set expiration date if not provided (default: 30 days)
    if (!reportData.expiresAt) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);
      reportData.expiresAt = expiresAt;
    }

    const report = await this.crud.create(reportData as any);

    // TODO: Trigger async report generation
    // await this._generateReportAsync(report._id);

    return report;
  }

  /**
   * Get report by ID
   */
  async getReportById(reportId: string): Promise<IReportDocument> {
    if (!Types.ObjectId.isValid(reportId)) {
      throw new BadRequestError('Invalid report ID');
    }

    const report = await Report.findById(reportId).lean();

    if (!report) {
      throw new NotFoundError(ERROR_MESSAGES.REPORT.NOT_FOUND);
    }

    return report as IReportDocument;
  }

  /**
   * Get all reports with filters
   */
  async getAllReports(filters: IReportFilters, page = 1, limit = 20) {
    const query = this.crud.query();

    // Apply filters
    if (filters.type) query.filter({ type: filters.type });
    if (filters.status) query.filter({ status: filters.status });
    if (filters.format) query.filter({ format: filters.format });
    if (filters.generatedBy) query.filter({ generatedBy: new Types.ObjectId(filters.generatedBy) });

    // Date range for createdAt
    if (filters.startDate || filters.endDate) {
      query.dateRange('createdAt', filters.startDate, filters.endDate);
    }

    // Pagination and sorting
    query.paginate(page, limit).sortBy('-createdAt');

    return query.execute();
  }

  /**
   * Get user's reports
   */
  async getUserReports(userId: string, page = 1, limit = 20) {
    const query = this.crud.query();

    query
      .filter({ generatedBy: new Types.ObjectId(userId) })
      .paginate(page, limit)
      .sortBy('-createdAt');

    return query.execute();
  }

  /**
   * Update report status
   */
  async updateReportStatus(
    reportId: string,
    status: ReportStatus,
    errorMessage?: string
  ): Promise<IReportDocument> {
    const updateData: any = { status };

    if (status === ReportStatus.COMPLETED) {
      updateData.generatedAt = new Date();
    }

    if (status === ReportStatus.FAILED && errorMessage) {
      updateData.errorMessage = errorMessage;
    }

    const report = await Report.findByIdAndUpdate(reportId, { $set: updateData }, { new: true });

    if (!report) {
      throw new NotFoundError(ERROR_MESSAGES.REPORT.NOT_FOUND);
    }

    return report;
  }

  /**
   * Attach file to report
   * Called after PDF/CSV generation
   */
  async attachFile(
    reportId: string,
    fileData: {
      fileId: Types.ObjectId;
      filename: string;
      format: ReportFormat;
      size: number;
      mimeType: string;
    }
  ): Promise<IReportDocument> {
    const report = await Report.findByIdAndUpdate(
      reportId,
      {
        $set: {
          file: fileData,
          status: ReportStatus.COMPLETED,
          generatedAt: new Date(),
        },
      },
      { new: true }
    );

    if (!report) {
      throw new NotFoundError(ERROR_MESSAGES.REPORT.NOT_FOUND);
    }

    return report;
  }

  /**
   * Delete report
   * Also deletes associated file from GridFS
   */
  async deleteReport(reportId: string): Promise<void> {
    // Verify report exists (throws NotFoundError if not found)
    await this.getReportById(reportId);

    // TODO: Delete file from GridFS if exists
    // const report = await this.getReportById(reportId);
    // if (report.file?.fileId) {
    //   await gridfsService.deleteFile(report.file.fileId);
    // }

    await Report.findByIdAndDelete(reportId);
  }

  /**
   * Delete expired reports
   * Called by scheduled job
   */
  async deleteExpiredReports(): Promise<number> {
    const now = new Date();

    // TODO: Find and delete files from GridFS
    // const expiredReports = await Report.find({
    //   expiresAt: { $lt: now },
    // }).select('_id file');
    // for (const report of expiredReports) {
    //   if (report.file?.fileId) {
    //     await gridfsService.deleteFile(report.file.fileId);
    //   }
    // }

    // Delete reports
    const result = await Report.deleteMany({
      expiresAt: { $lt: now },
    });

    return result.deletedCount || 0;
  }

  /**
   * Get report statistics
   */
  async getReportStatistics(userId?: string): Promise<IReportStatistics> {
    const matchStage: any = {};
    if (userId) {
      matchStage.generatedBy = new Types.ObjectId(userId);
    }

    const stats = await Report.aggregate([
      { $match: matchStage },
      {
        $facet: {
          total: [{ $count: 'count' }],
          byType: [
            {
              $group: {
                _id: '$type',
                count: { $sum: 1 },
              },
            },
          ],
          byStatus: [
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 },
              },
            },
          ],
          byFormat: [
            {
              $group: {
                _id: '$format',
                count: { $sum: 1 },
              },
            },
          ],
        },
      },
    ]);

    const result = stats[0];

    // Transform to statistics format
    const byType: Record<string, number> = {};
    for (const type of Object.values(ReportType)) {
      byType[type] = 0;
    }
    result.byType.forEach((item: any) => {
      byType[item._id] = item.count;
    });

    const byStatus: Record<string, number> = {};
    for (const status of Object.values(ReportStatus)) {
      byStatus[status] = 0;
    }
    result.byStatus.forEach((item: any) => {
      byStatus[item._id] = item.count;
    });

    const byFormat: Record<string, number> = {};
    for (const format of Object.values(ReportFormat)) {
      byFormat[format] = 0;
    }
    result.byFormat.forEach((item: any) => {
      byFormat[item._id] = item.count;
    });

    return {
      total: result.total[0]?.count || 0,
      byType: byType as Record<ReportType, number>,
      byStatus: byStatus as Record<ReportStatus, number>,
      byFormat: byFormat as Record<ReportFormat, number>,
    };
  }

  /**
   * Generate report (async)
   * TODO: Implement with PDF/GridFS services
   * @private - Will be used once PDF/GridFS services are implemented
   */
  // @ts-ignore - Unused until PDF/GridFS services are implemented
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async _generateReportAsync(reportId: Types.ObjectId): Promise<void> {
    try {
      // Update status to generating
      await this.updateReportStatus(reportId.toString(), ReportStatus.GENERATING);

      // TODO: Generate PDF based on report type
      // const pdfBuffer = await pdfService.generateReport(report);

      // TODO: Upload to GridFS
      // const fileId = await gridfsService.uploadFile(pdfBuffer, filename);

      // TODO: Attach file to report
      // await this.attachFile(reportId.toString(), fileData);

      // Placeholder: Mark as completed
      await this.updateReportStatus(reportId.toString(), ReportStatus.COMPLETED);
    } catch (error) {
      await this.updateReportStatus(
        reportId.toString(),
        ReportStatus.FAILED,
        error instanceof Error ? error.message : 'Unknown error'
      );
      throw error;
    }
  }
}

export default new ReportService();
