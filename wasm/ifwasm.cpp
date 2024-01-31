#include <stdlib.h>
#include <SDL/SDL.h>
#include <emscripten.h>
#include <emscripten/bind.h>
#include <opencv2/opencv.hpp>
#include <opencv2/opencv.hpp>
#include "../src/MainProcess.h"

namespace {

constexpr int WIDTH = 640;
constexpr int HEIGHT = 480;
SDL_Surface *screen = nullptr;

} // namespace

#define LOG_OUTPUT 0

#if LOG_OUTPUT
EM_JS(int, console_log, (const char *logstr), {
  console.log('aaaaa ' + UTF8ToString(logstr));
  return 0;
});
#else
#define console_log(logstr)
#endif

extern "C" int main(int argc, char **argv) {
  console_log(__PRETTY_FUNCTION__);
  SDL_Init(SDL_INIT_VIDEO);
  screen = SDL_SetVideoMode(WIDTH, HEIGHT, 32, SDL_SWSURFACE);

  return 0;
}

extern "C" {
size_t EMSCRIPTEN_KEEPALIVE creata_buffer(int size) {
  console_log(__PRETTY_FUNCTION__);
  return (size_t)malloc(size * sizeof(uint8_t));
}

void EMSCRIPTEN_KEEPALIVE destroy_buffer(size_t p) {
  console_log(__PRETTY_FUNCTION__);
  void *pbuf = (void*)p;
  free(pbuf);
}

void EMSCRIPTEN_KEEPALIVE Convert(size_t addr, int width, int height, int cnt) {
  console_log(__PRETTY_FUNCTION__);
  auto data = reinterpret_cast<void *>(addr);
  cv::Mat rgbaMat(height, width, CV_8UC4, data);
  cv::Mat rgbMat;
  cv::Mat rgbOutMat;
  cv::Mat outMat;
  ConvertColor(rgbaMat, rgbMat, cv::COLOR_RGBA2RGB);
  rgbMat.convertTo(rgbOutMat, -1, 1.0, cnt - 100.0);
  ConvertColor(rgbOutMat, outMat, cv::COLOR_RGB2RGBA);

  if (SDL_MUSTLOCK(screen))
    SDL_LockSurface(screen);
  cv::Mat dstRGBAImage(height, width, CV_8UC4, screen->pixels);
  outMat.copyTo(dstRGBAImage);
  if (SDL_MUSTLOCK(screen))
    SDL_UnlockSurface(screen);
  SDL_Flip(screen);
}
} /* extern "C" */

//EMSCRIPTEN_BINDINGS(my_module) {
//  emscripten::function("convert", &Convert);
//  emscripten::function("creatabuffer", &creata_buffer);
//  emscripten::function("destroybuffer", &destroy_buffer);
//}
