<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Optimizing...
                          </>
                        ) : (
  'Optimize Now'
)}
                      </button >
                    </div >
                  ))}
                </div >
              ) : (
  <div className="text-center py-12 text-gray-500">
    <IndianRupee className="w-16 h-16 mx-auto mb-4 text-green-500" />
    <p>No optimization opportunities found. Your infrastructure is well-optimized!</p>
  </div>
)}
            </div >
          </div >
        </div >
      </div >
    </div >
  );
};

export default CostAnalytics;
