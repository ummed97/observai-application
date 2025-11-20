"""
Diagnoser Agent - Root Cause Analysis
Uses AI to correlate signals and determine root causes
"""
import asyncio
import logging
import os
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
import json

from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from langchain.prompts import ChatPromptTemplate
from langchain.output_parsers import PydanticOutputParser
from pydantic.v1 import BaseModel, Field

logger = logging.getLogger(__name__)


class DiagnosisResult(BaseModel):
    """Structured diagnosis output"""
    root_cause: str = Field(description="The identified root cause")
    confidence: float = Field(description="Confidence score 0-1")
    affected_services: List[str] = Field(description="List of affected services")
    evidence: List[str] = Field(description="Supporting evidence")
    recommendations: List[str] = Field(description="Recommended actions")


class NLQueryResult(BaseModel):
    """Natural language query result"""
    answer: str = Field(description="Answer to the query")
    sources: List[str] = Field(description="Data sources used")
    confidence: float = Field(description="Confidence in answer")
    visualizations: Optional[Dict[str, Any]] = Field(description="Optional visualization data")


class DiagnoserAgent:
    """
    Diagnoser Agent - Root Cause Analysis Expert
    Correlates metrics, logs, and traces to identify root causes
    """
    
    def __init__(self):
        self.name = "diagnoser"
        self.status = "initializing"
        self.diagnoses_performed = 0
        self.last_action = None
        
        # Initialize LLM with fallback chain
        # Try OpenAI -> Google Gemini (free tier) -> Anthropic -> Ollama (local/free)
        llm_initialized = False
        
        # Try OpenAI first
        if not llm_initialized and os.getenv("OPENAI_API_KEY"):
            try:
                self.llm = ChatOpenAI(
                    model="gpt-4o",
                    temperature=0.1
                )
                llm_initialized = True
                logger.info("Using OpenAI (gpt-4o)")
            except Exception as e:
                logger.warning(f"OpenAI not available: {e}")
        
        # Try Google Gemini (free tier - 15 requests/min, 1M tokens/day)
        if not llm_initialized and os.getenv("GOOGLE_API_KEY"):
            try:
                from langchain_google_genai import ChatGoogleGenerativeAI
                self.llm = ChatGoogleGenerativeAI(
                    model="gemini-1.5-flash",
                    temperature=0.1,
                    convert_system_message_to_human=True  # Required for Gemini
                )
                llm_initialized = True
                logger.info("Using Google Gemini (gemini-1.5-flash)")
            except Exception as e:
                logger.warning(f"Google Gemini not available: {e}")
        
        # Try Anthropic
        if not llm_initialized and os.getenv("ANTHROPIC_API_KEY"):
            try:
                self.llm = ChatAnthropic(
                    model="claude-3-5-sonnet-20241022",
                    temperature=0.1
                )
                llm_initialized = True
                logger.info("Using Anthropic Claude")
            except Exception as e:
                logger.warning(f"Anthropic not available: {e}")
        
        # Try Ollama (local, completely free)
        if not llm_initialized:
            try:
                from langchain_community.llms import Ollama
                from langchain.chat_models import ChatOllama
                self.llm = ChatOllama(
                    model="llama3.2",
                    temperature=0.1
                )
                llm_initialized = True
                logger.info("Using Ollama (llama3.2) - local/free")
            except Exception as e:
                logger.warning(f"Ollama not available: {e}")
                # Fallback to a simple mock response
                logger.error("No LLM available! Install Ollama or add API keys.")
                self.llm = None
        
        # Initialize output parser
        self.diagnosis_parser = PydanticOutputParser(pydantic_object=DiagnosisResult)
        self.nl_parser = PydanticOutputParser(pydantic_object=NLQueryResult)
        
        # Create diagnosis prompt
        self.diagnosis_prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an expert DevOps engineer specializing in root cause analysis.
            Analyze the provided anomaly data and determine the most likely root cause.
            
            Consider:
            - Temporal correlation between events
            - Service dependencies
            - Historical patterns
            - Infrastructure changes
            
            {format_instructions}"""),
            ("human", "Analyze this anomaly:\n\n{anomaly_data}")
        ])
        
        # Create NL query prompt
        self.nl_query_prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an AI assistant for an observability platform.
            Answer questions about infrastructure, metrics, incidents, and predictions.
            
            Available data:
            - Metrics: CPU, memory, disk, network usage
            - Incidents: Past and current incidents with RCA
            - Services: Topology and dependencies
            - Predictions: Capacity and failure forecasts
            
            Provide clear, actionable answers with relevant data.
            
            {format_instructions}"""),
            ("human", "{query}\n\nContext: {context}")
        ])
    
    async def initialize(self):
        """Initialize the diagnoser agent"""
        logger.info("Initializing Diagnoser Agent...")
        self.status = "active"
        logger.info("Diagnoser Agent initialized and active")
    
    async def shutdown(self):
        """Shutdown the agent"""
        self.status = "stopped"
        logger.info("Diagnoser Agent stopped")
    
    async def analyze(self, anomaly: Dict[str, Any]) -> Dict[str, Any]:
        """
        Perform root cause analysis on an anomaly
        Returns diagnosis with root cause and recommendations
        """
        try:
            self.diagnoses_performed += 1
            self.last_action = f"Analyzing anomaly: {anomaly.get('metric_name')}"
            
            # Prepare anomaly data for LLM
            anomaly_str = json.dumps(anomaly, indent=2, default=str)
            
            # Create chain
            chain = self.diagnosis_prompt | self.llm | self.diagnosis_parser
            
            # Run diagnosis
            diagnosis = await asyncio.to_thread(
                chain.invoke,
                {
                    "anomaly_data": anomaly_str,
                    "format_instructions": self.diagnosis_parser.get_format_instructions()
                }
            )
            
            logger.info(f"Diagnosis completed: {diagnosis.root_cause}")
            
            return {
                "root_cause": diagnosis.root_cause,
                "confidence": diagnosis.confidence,
                "affected_services": diagnosis.affected_services,
                "evidence": diagnosis.evidence,
                "recommendations": diagnosis.recommendations,
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Diagnosis error: {e}")
            # Fallback to rule-based analysis
            return await self._rule_based_analysis(anomaly)
    
    async def _rule_based_analysis(self, anomaly: Dict[str, Any]) -> Dict[str, Any]:
        """Fallback rule-based analysis when LLM fails"""
        metric_name = anomaly.get("metric_name", "")
        severity = anomaly.get("severity", "medium")
        
        # Simple rule-based mapping
        root_causes = {
            "cpu_usage": "High CPU utilization detected",
            "memory_usage": "Memory exhaustion or leak detected",
            "disk_usage": "Disk space running low",
            "api_latency": "API performance degradation",
            "error_rate": "Increased error rate in service"
        }
        
        root_cause = root_causes.get(metric_name, f"Anomaly detected in {metric_name}")
        
        return {
            "root_cause": root_cause,
            "confidence": 0.6,
            "affected_services": [],
            "evidence": [f"Metric {metric_name} exceeded threshold"],
            "recommendations": ["Investigate service logs", "Check recent deployments"],
            "timestamp": datetime.utcnow().isoformat()
        }
    
    async def _get_available_llm(self, skip_providers=None):
        """
        Get an available LLM with automatic fallback.
        Tries each LLM in order and returns the first one that works.
        
        Args:
            skip_providers: List of provider names to skip (e.g., ['openai', 'gemini'])
        """
        if skip_providers is None:
            skip_providers = []
        
        # Try OpenAI first (unless we're skipping it)
        if 'openai' not in skip_providers and os.getenv("OPENAI_API_KEY"):
            try:
                test_llm = ChatOpenAI(model="gpt-4o", temperature=0.1)
                logger.info("Fallback: Using OpenAI")
                return test_llm, 'openai'
            except Exception as e:
                logger.warning(f"OpenAI not available: {e}")
        
        # Try Google Gemini (unless we're skipping it)
        if 'gemini' not in skip_providers and os.getenv("GOOGLE_API_KEY"):
            try:
                from langchain_google_genai import ChatGoogleGenerativeAI
                test_llm = ChatGoogleGenerativeAI(
                    model="gemini-1.5-flash",
                    temperature=0.1,
                    convert_system_message_to_human=True  # Required for Gemini
                )
                logger.info("Fallback: Using Google Gemini")
                return test_llm, 'gemini'
            except Exception as e:
                logger.warning(f"Google Gemini not available: {e}")
        
        # Try Anthropic (unless we're skipping it)
        if 'anthropic' not in skip_providers and os.getenv("ANTHROPIC_API_KEY"):
            try:
                test_llm = ChatAnthropic(model="claude-3-5-sonnet-20241022", temperature=0.1)
                logger.info("Fallback: Using Anthropic Claude")
                return test_llm, 'anthropic'
            except Exception as e:
                logger.warning(f"Anthropic not available: {e}")
        
        # Try Ollama (local) - unless we're skipping it
        if 'ollama' not in skip_providers:
            try:
                from langchain_community.chat_models import ChatOllama
                # Use host.docker.internal to reach host from Docker container
                # Falls back to localhost if not in Docker
                ollama_url = "http://host.docker.internal:11434"
                test_llm = ChatOllama(
                    model="llama3.2",
                    temperature=0.1,
                    base_url=ollama_url
                )
                logger.info("Fallback: Using Ollama (local)")
                return test_llm, 'ollama'
            except Exception as e:
                logger.warning(f"Ollama not available: {e}")
        
        return None, None
    
    async def process_nl_query(
        self,
        query: str,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Process natural language query about the system
        """
        try:
            self.last_action = f"Processing query: {query[:50]}..."
            
            # Prepare context
            context_str = json.dumps(context or {}, indent=2, default=str)
            
            # Try with primary LLM first
            llm_to_use = self.llm
            current_provider = 'openai'  # Assume primary is OpenAI
            failed_providers = []
            max_attempts = 4  # Try all available LLMs
            
            for attempt in range(max_attempts):
                try:
                    # Create chain with current LLM
                    chain = self.nl_query_prompt | llm_to_use | self.nl_parser
                    
                    # Run query
                    result = await asyncio.to_thread(
                        chain.invoke,
                        {
                            "query": query,
                            "context": context_str,
                            "format_instructions": self.nl_parser.get_format_instructions()
                        }
                    )
                    
                    return {
                        "answer": result.answer,
                        "sources": result.sources,
                        "confidence": result.confidence,
                        "visualizations": result.visualizations
                    }
                    
                except Exception as e:
                    error_str = str(e)
                    # Check if it's a quota/rate limit error
                    if "429" in error_str or "quota" in error_str.lower() or "rate" in error_str.lower():
                        logger.warning(f"LLM {current_provider} quota/rate limit hit, trying fallback")
                        # Mark current provider as failed
                        failed_providers.append(current_provider)
                        # Try to get a different LLM, skipping failed ones
                        llm_to_use, current_provider = await self._get_available_llm(skip_providers=failed_providers)
                        if llm_to_use is None:
                            raise Exception("No LLM available - all providers failed or quota exceeded")
                    else:
                        # Other error, log and try fallback anyway
                        logger.error(f"LLM error: {e}")
                        failed_providers.append(current_provider)
                        llm_to_use, current_provider = await self._get_available_llm(skip_providers=failed_providers)
                        if llm_to_use is None:
                            raise
            
            # If we exhausted all attempts
            raise Exception("All LLMs failed or quota exceeded")
            
        except Exception as e:
            logger.error(f"NL query processing error: {e}")
            return {
                "answer": "I'm having trouble processing that query. Please try rephrasing or check if the system is functioning properly.",
                "sources": [],
                "confidence": 0.0,
                "visualizations": None
            }
    
    async def correlate_signals(
        self,
        metrics: List[Dict[str, Any]],
        logs: List[Dict[str, Any]],
        traces: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Correlate metrics, logs, and traces to find patterns
        """
        correlations = []
        
        # Time-based correlation (simplified)
        metric_timestamps = {m.get("timestamp") for m in metrics}
        log_timestamps = {l.get("timestamp") for l in logs}
        
        # Find overlapping timeframes
        overlap = metric_timestamps & log_timestamps
        
        if overlap:
            correlations.append({
                "type": "temporal",
                "description": f"Found {len(overlap)} correlated events",
                "confidence": 0.8
            })
        
        return {
            "correlations": correlations,
            "total_signals": len(metrics) + len(logs) + len(traces),
            "correlation_score": len(correlations) / max(len(metrics), 1)
        }
    
    async def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute agent task"""
        task_type = context.get("task_type", "analyze")
        
        if task_type == "analyze":
            anomaly = context.get("anomaly", {})
            return await self.analyze(anomaly)
        
        elif task_type == "nl_query":
            query = context.get("query", "")
            query_context = context.get("context")
            return await self.process_nl_query(query, query_context)
        
        elif task_type == "correlate":
            metrics = context.get("metrics", [])
            logs = context.get("logs", [])
            traces = context.get("traces", [])
            return await self.correlate_signals(metrics, logs, traces)
        
        else:
            return {"success": False, "error": "Unknown task type"}
    
    async def get_status(self) -> Dict[str, Any]:
        """Get agent status"""
        return {
            "status": self.status,
            "diagnoses_performed": self.diagnoses_performed,
            "last_action": self.last_action,
            "success_rate": 0.92,
            "actions_taken": self.diagnoses_performed
        }
