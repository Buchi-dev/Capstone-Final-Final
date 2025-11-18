/**
 * useAdvancedAnalytics - Local Hook (UI Logic Only)
 * 
 * Performs advanced analytics calculations including:
 * - Trend analysis with linear regression
 * - Anomaly detection
 * - Parameter correlations
 * - Predictive insights
 * 
 * NO service layer calls - pure data transformation.
 * 
 * @module pages/admin/AdminAnalytics/hooks
 */
import { useMemo } from 'react';
import type {
  TimeSeriesDataPoint,
  TrendAnalysis,
  CorrelationAnalysis,
  MetricType,
} from '../../../../schemas/analytics.schema';

interface AnomalyPoint {
  timestamp: number;
  parameter: 'ph' | 'tds' | 'turbidity';
  value: number;
  expectedValue: number;
  deviation: number;
  severity: 'low' | 'medium' | 'high';
}

interface PredictiveInsight {
  parameter: MetricType;
  currentValue: number;
  predictedValue: number;
  predictedChange: number; // percentage
  confidence: number; // 0-100
  timeframe: string; // "next hour", "next 24 hours"
  recommendation: string;
}

/**
 * Calculate linear regression for trend analysis
 */
function calculateLinearRegression(data: number[]): { slope: number; intercept: number; r2: number } {
  if (data.length < 2) return { slope: 0, intercept: 0, r2: 0 };

  const n = data.length;
  const xValues = Array.from({ length: n }, (_, i) => i);
  
  const sumX = xValues.reduce((sum, x) => sum + x, 0);
  const sumY = data.reduce((sum, y) => sum + y, 0);
  const sumXY = xValues.reduce((sum, x, i) => sum + x * data[i], 0);
  const sumX2 = xValues.reduce((sum, x) => sum + x * x, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Calculate R²
  const yMean = sumY / n;
  const ssTotal = data.reduce((sum, y) => sum + Math.pow(y - yMean, 2), 0);
  const ssResidual = data.reduce((sum, y, i) => {
    const predicted = slope * i + intercept;
    return sum + Math.pow(y - predicted, 2);
  }, 0);
  const r2 = 1 - (ssResidual / ssTotal);

  return { slope, intercept, r2: Math.max(0, r2) };
}

/**
 * Calculate Pearson correlation coefficient
 */
function calculateCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length < 2) return 0;

  const n = x.length;
  const sumX = x.reduce((sum, val) => sum + val, 0);
  const sumY = y.reduce((sum, val) => sum + val, 0);
  const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
  const sumX2 = x.reduce((sum, val) => sum + val * val, 0);
  const sumY2 = y.reduce((sum, val) => sum + val * val, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  return denominator === 0 ? 0 : numerator / denominator;
}

/**
 * Detect anomalies using Z-score method
 */
function detectAnomalies(data: number[], threshold: number = 2.5): number[] {
  if (data.length < 3) return [];

  const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
  const stdDev = Math.sqrt(
    data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length
  );

  return data.map((value, index) => {
    const zScore = Math.abs((value - mean) / stdDev);
    return zScore > threshold ? index : -1;
  }).filter(index => index !== -1);
}

/**
 * Use advanced analytics processing for trend analysis, anomaly detection, and predictions
 * 
 * @param timeSeriesData - Time-series data points
 * @param historicalWindow - Number of data points to analyze (default: 24)
 * @returns Advanced analytics insights
 * 
 * @example
 * ```tsx
 * const { 
 *   trendAnalysis, 
 *   anomalies, 
 *   correlations, 
 *   predictions 
 * } = useAdvancedAnalytics(timeSeriesData, 48);
 * ```
 */
export const useAdvancedAnalytics = (
  timeSeriesData: TimeSeriesDataPoint[],
  historicalWindow: number = 24
) => {
  // Trend Analysis
  const trendAnalysis = useMemo<TrendAnalysis[]>(() => {
    if (timeSeriesData.length < 2) return [];

    const recentData = timeSeriesData.slice(-historicalWindow);
    
    const phValues = recentData.map(d => d.ph).filter(v => v > 0);
    const tdsValues = recentData.map(d => d.tds).filter(v => v > 0);
    const turbidityValues = recentData.map(d => d.turbidity).filter(v => v >= 0);

    const trends: TrendAnalysis[] = [];

    // pH Trend
    if (phValues.length >= 2) {
      const phRegression = calculateLinearRegression(phValues);
      const phDirection = 
        Math.abs(phRegression.slope) < 0.01 ? 'stable' :
        phRegression.slope > 0 ? 'increasing' : 'decreasing';
      
      const prediction = phRegression.slope * phValues.length + phRegression.intercept;

      trends.push({
        parameter: 'ph',
        direction: phDirection,
        slope: phRegression.slope,
        confidence: Math.round(phRegression.r2 * 100),
        prediction: Math.max(0, Math.min(14, prediction)),
        anomalyDetected: detectAnomalies(phValues).length > 0,
      });
    }

    // TDS Trend
    if (tdsValues.length >= 2) {
      const tdsRegression = calculateLinearRegression(tdsValues);
      const tdsDirection = 
        Math.abs(tdsRegression.slope) < 1 ? 'stable' :
        tdsRegression.slope > 0 ? 'increasing' : 'decreasing';

      const prediction = tdsRegression.slope * tdsValues.length + tdsRegression.intercept;

      trends.push({
        parameter: 'tds',
        direction: tdsDirection,
        slope: tdsRegression.slope,
        confidence: Math.round(tdsRegression.r2 * 100),
        prediction: Math.max(0, prediction),
        anomalyDetected: detectAnomalies(tdsValues).length > 0,
      });
    }

    // Turbidity Trend
    if (turbidityValues.length >= 2) {
      const turbidityRegression = calculateLinearRegression(turbidityValues);
      const turbidityDirection = 
        Math.abs(turbidityRegression.slope) < 0.1 ? 'stable' :
        turbidityRegression.slope > 0 ? 'increasing' : 'decreasing';

      const prediction = turbidityRegression.slope * turbidityValues.length + turbidityRegression.intercept;

      trends.push({
        parameter: 'turbidity',
        direction: turbidityDirection,
        slope: turbidityRegression.slope,
        confidence: Math.round(turbidityRegression.r2 * 100),
        prediction: Math.max(0, prediction),
        anomalyDetected: detectAnomalies(turbidityValues).length > 0,
      });
    }

    return trends;
  }, [timeSeriesData, historicalWindow]);

  // Anomaly Detection
  const anomalies = useMemo<AnomalyPoint[]>(() => {
    if (timeSeriesData.length < 3) return [];

    const recentData = timeSeriesData.slice(-historicalWindow);
    const anomalyPoints: AnomalyPoint[] = [];

    // pH Anomalies
    const phValues = recentData.map(d => d.ph).filter(v => v > 0);
    const phAnomalyIndices = detectAnomalies(phValues, 2.0);
    const phMean = phValues.reduce((sum, v) => sum + v, 0) / phValues.length;

    phAnomalyIndices.forEach(index => {
      if (index < recentData.length) {
        const deviation = Math.abs(recentData[index].ph - phMean);
        anomalyPoints.push({
          timestamp: recentData[index].timestamp,
          parameter: 'ph',
          value: recentData[index].ph,
          expectedValue: phMean,
          deviation,
          severity: deviation > 1.5 ? 'high' : deviation > 0.8 ? 'medium' : 'low',
        });
      }
    });

    // TDS Anomalies
    const tdsValues = recentData.map(d => d.tds).filter(v => v > 0);
    const tdsAnomalyIndices = detectAnomalies(tdsValues, 2.0);
    const tdsMean = tdsValues.reduce((sum, v) => sum + v, 0) / tdsValues.length;

    tdsAnomalyIndices.forEach(index => {
      if (index < recentData.length) {
        const deviation = Math.abs(recentData[index].tds - tdsMean);
        anomalyPoints.push({
          timestamp: recentData[index].timestamp,
          parameter: 'tds',
          value: recentData[index].tds,
          expectedValue: tdsMean,
          deviation,
          severity: deviation > 200 ? 'high' : deviation > 100 ? 'medium' : 'low',
        });
      }
    });

    // Turbidity Anomalies
    const turbidityValues = recentData.map(d => d.turbidity).filter(v => v >= 0);
    const turbidityAnomalyIndices = detectAnomalies(turbidityValues, 2.0);
    const turbidityMean = turbidityValues.reduce((sum, v) => sum + v, 0) / turbidityValues.length;

    turbidityAnomalyIndices.forEach(index => {
      if (index < recentData.length) {
        const deviation = Math.abs(recentData[index].turbidity - turbidityMean);
        anomalyPoints.push({
          timestamp: recentData[index].timestamp,
          parameter: 'turbidity',
          value: recentData[index].turbidity,
          expectedValue: turbidityMean,
          deviation,
          severity: deviation > 10 ? 'high' : deviation > 5 ? 'medium' : 'low',
        });
      }
    });

    return anomalyPoints.sort((a, b) => b.timestamp - a.timestamp);
  }, [timeSeriesData, historicalWindow]);

  // Parameter Correlations
  const correlations = useMemo<CorrelationAnalysis[]>(() => {
    if (timeSeriesData.length < 3) return [];

    const recentData = timeSeriesData.slice(-historicalWindow);
    
    const phValues = recentData.map(d => d.ph).filter((v, i) => 
      v > 0 && recentData[i].tds > 0 && recentData[i].turbidity >= 0
    );
    const tdsValues = recentData.map(d => d.tds).filter((v, i) => 
      v > 0 && recentData[i].ph > 0 && recentData[i].turbidity >= 0
    );
    const turbidityValues = recentData.map(d => d.turbidity).filter((v, i) => 
      v >= 0 && recentData[i].ph > 0 && recentData[i].tds > 0
    );

    if (phValues.length < 3 || tdsValues.length < 3 || turbidityValues.length < 3) {
      return [];
    }

    const correlationResults: CorrelationAnalysis[] = [];

    // pH vs TDS
    const phTdsCorr = calculateCorrelation(phValues, tdsValues);
    correlationResults.push({
      parameter1: 'ph',
      parameter2: 'tds',
      correlationCoefficient: phTdsCorr,
      strength: 
        Math.abs(phTdsCorr) > 0.7 ? 'strong' :
        Math.abs(phTdsCorr) > 0.4 ? 'moderate' :
        Math.abs(phTdsCorr) > 0.2 ? 'weak' : 'none',
    });

    // pH vs Turbidity
    const phTurbidityCorr = calculateCorrelation(phValues, turbidityValues);
    correlationResults.push({
      parameter1: 'ph',
      parameter2: 'turbidity',
      correlationCoefficient: phTurbidityCorr,
      strength: 
        Math.abs(phTurbidityCorr) > 0.7 ? 'strong' :
        Math.abs(phTurbidityCorr) > 0.4 ? 'moderate' :
        Math.abs(phTurbidityCorr) > 0.2 ? 'weak' : 'none',
    });

    // TDS vs Turbidity
    const tdsTurbidityCorr = calculateCorrelation(tdsValues, turbidityValues);
    correlationResults.push({
      parameter1: 'tds',
      parameter2: 'turbidity',
      correlationCoefficient: tdsTurbidityCorr,
      strength: 
        Math.abs(tdsTurbidityCorr) > 0.7 ? 'strong' :
        Math.abs(tdsTurbidityCorr) > 0.4 ? 'moderate' :
        Math.abs(tdsTurbidityCorr) > 0.2 ? 'weak' : 'none',
    });

    return correlationResults;
  }, [timeSeriesData, historicalWindow]);

  // Predictive Insights
  const predictions = useMemo<PredictiveInsight[]>(() => {
    if (trendAnalysis.length === 0) return [];

    const insights: PredictiveInsight[] = [];

    trendAnalysis.forEach(trend => {
      const recentData = timeSeriesData.slice(-historicalWindow);
      let currentValue = 0;

      if (trend.parameter === 'ph') {
        const phValues = recentData.map(d => d.ph).filter(v => v > 0);
        currentValue = phValues[phValues.length - 1] || 0;
      } else if (trend.parameter === 'tds') {
        const tdsValues = recentData.map(d => d.tds).filter(v => v > 0);
        currentValue = tdsValues[tdsValues.length - 1] || 0;
      } else if (trend.parameter === 'turbidity') {
        const turbidityValues = recentData.map(d => d.turbidity).filter(v => v >= 0);
        currentValue = turbidityValues[turbidityValues.length - 1] || 0;
      }

      const predictedChange = currentValue > 0 
        ? ((trend.prediction - currentValue) / currentValue) * 100 
        : 0;

      let recommendation = '';

      if (trend.parameter === 'ph') {
        if (trend.prediction < 6.5 || trend.prediction > 8.5) {
          recommendation = 'pH trending outside safe range. Consider water treatment adjustment.';
        } else if (trend.direction !== 'stable') {
          recommendation = `pH ${trend.direction}. Monitor for stability.`;
        } else {
          recommendation = 'pH levels stable and within acceptable range.';
        }
      } else if (trend.parameter === 'tds') {
        if (trend.prediction > 500) {
          recommendation = 'TDS approaching threshold. Filtration or source check recommended.';
        } else if (trend.direction === 'increasing') {
          recommendation = 'TDS increasing. Monitor dissolved solids concentration.';
        } else {
          recommendation = 'TDS levels acceptable.';
        }
      } else if (trend.parameter === 'turbidity') {
        if (trend.prediction > 5) {
          recommendation = 'Turbidity rising above acceptable levels. Check water clarity and filtration.';
        } else if (trend.direction === 'increasing') {
          recommendation = 'Turbidity increasing. Monitor for cloudiness.';
        } else {
          recommendation = 'Turbidity levels acceptable.';
        }
      }

      insights.push({
        parameter: trend.parameter,
        currentValue,
        predictedValue: trend.prediction,
        predictedChange,
        confidence: trend.confidence,
        timeframe: 'next 6 hours',
        recommendation,
      });
    });

    return insights;
  }, [trendAnalysis, timeSeriesData, historicalWindow]);

  return {
    trendAnalysis,
    anomalies,
    correlations,
    predictions,
  };
};
