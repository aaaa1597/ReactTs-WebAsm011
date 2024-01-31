#include <opencv2/opencv.hpp>
#include "../src/MainProcess.h"

int main(int argc, char *argv[]) {
  /* 画像の読み込み */
  cv::Mat inputImage = cv::imread("../../input.jpg");

  /* 画像が正しく読み込まれたかを確認 */
  if (inputImage.empty()) {
    std::cerr << "画像を読み込めませんでした" << std::endl;
    return -1;
  }

  /* 画像処理 */
  cv::Mat grayscaleImage;
  ConvertColor(inputImage, grayscaleImage, cv::COLOR_BGR2GRAY);

  /* 処理画像を表示 */
  cv::imshow("Grayscale Image", grayscaleImage);

  /* キー入力待ち */
  cv::waitKey(0);

  /* ウィンドウを閉じる */
  cv::destroyAllWindows();

  return 0;
}