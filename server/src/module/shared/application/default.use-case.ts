export abstract class DefaultUseCase<P = void, R = void> {
  abstract execute(params: P): Promise<R> | R;
}
