#include <string>
#include <vector>
#include <complex>
#include <emscripten.h>
#include <emscripten/bind.h>


#define LOG_OUTPUT 1
#if LOG_OUTPUT
EM_JS(int, console_log, (const char *logstr), {
  console.log('aaaaa ' + UTF8ToString(logstr));
  return 0;
});
#else
#define console_log(logstr)
#endif

extern "C" {
// int,int,int
int func1(int a, int b){
	console_log(__PRETTY_FUNCTION__);
	return a + b;
}

// double, double, double
double func2(double a, double b){
	console_log(__PRETTY_FUNCTION__);
	return a + b;
}

// std::string, std::string, std::string
std::string func3(const std::string &s1, const std::string &s2){
	console_log(__PRETTY_FUNCTION__);
	return s1 + " " + s2;
}

// int配列, int配列, int配列
emscripten::val func4(const emscripten::val &arg1, const emscripten::val &arg2){
	console_log(__PRETTY_FUNCTION__);
	std::vector<int> v1 = vecFromJSArray<int>(arg1);
	std::vector<int> v2 = vecFromJSArray<int>(arg2);
	std::vector<int> retvec(v1.begin(), v1.end());
	std::copy(v2.begin(),v2.end(),std::back_inserter(retvec));
	emscripten::val retarray = emscripten::val::array(retvec.begin(), retvec.end());
	return retarray;
}

// UInt8配列, UInt8配列, UInt8配列
emscripten::val func5(const emscripten::val &arg1, const emscripten::val &arg2) {
	console_log(__PRETTY_FUNCTION__);
	std::vector<uint8_t> v1 = vecFromJSArray<uint8_t>(arg1);
	std::vector<uint8_t> v2 = vecFromJSArray<uint8_t>(arg2);
	std::vector<uint8_t> retvec(v1.begin(), v1.end());
	std::copy(v2.begin(),v2.end(),std::back_inserter(retvec));
	emscripten::val retarray = emscripten::val::array(retvec.begin(), retvec.end());
	return retarray;
}

// string配列, string配列, string配列
emscripten::val func6(const emscripten::val &arg1, const emscripten::val &arg2){
	console_log(__PRETTY_FUNCTION__);
	std::vector<std::string> v1 = vecFromJSArray<std::string>(arg1);
	std::vector<std::string> v2 = vecFromJSArray<std::string>(arg2);
	std::vector<std::string> retvec(v1.begin(), v1.end());
	std::copy(v2.begin(),v2.end(), std::back_inserter(retvec));
	emscripten::val retarray = emscripten::val::array(retvec.begin(), retvec.end());
	return retarray;
}

// JSオブジェクト, JSオブジェクト, JSオブジェクト
emscripten::val func7(const emscripten::val &arg1, const emscripten::val &arg2){
	console_log(__PRETTY_FUNCTION__);
	int x = arg1["x"].as<int>();
	int y = arg1["y"].as<int>();
	int w = arg2["x"].as<int>();
	int h = arg2["y"].as<int>();
	emscripten::val ret = emscripten::val::global("rect").new_(x,y,w,h);
	return ret;
}

// JSONオブジェクト, JSONオブジェクト, JSONオブジェクト
emscripten::val func8(const emscripten::val &arg1, const emscripten::val &arg2) {
	console_log(__PRETTY_FUNCTION__);
	int x = arg1["x2"].as<int>();
	int y = arg1["y2"].as<int>();
	int w = arg2["w2"].as<int>();
	int h = arg2["h2"].as<int>();
	emscripten::val ret = emscripten::val::object();
	ret.set("xx",x);
	ret.set("yy",y);
	ret.set("ww",y);
	ret.set("hh",y);
	return ret;
}
EMSCRIPTEN_BINDINGS(module) {
	emscripten::function("f1", &func1);
	emscripten::function("f2", &func2);
	emscripten::function("f3", &func3);
	emscripten::function("f4", &func4);
	emscripten::function("f5", &func5);
	emscripten::function("f6", &func6);
	emscripten::function("f7", &func7);
	emscripten::function("f8", &func8); 
}
}	//extern "C" 
