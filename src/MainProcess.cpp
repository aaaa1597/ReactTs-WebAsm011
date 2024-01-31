#include <opencv2/opencv.hpp>

void ConvertColor(const cv::Mat &inmat, cv::Mat &outmat, int ccc) {
  cv::cvtColor(inmat, outmat, ccc);
  return;
}
